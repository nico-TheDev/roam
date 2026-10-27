// Seeds hosts, policies and 30 stays. Safe to run any number of times.
//   npx sanity exec scripts/seed.ts --with-user-token            create what is missing, skip what exists
//   npx sanity exec scripts/seed.ts --with-user-token -- --update  also overwrite the seeded fields of existing documents
// Sanity generates every _id. Existing documents are found by slug.current, and references use the ids that come back.
import {getCliClient} from 'sanity/cli'
import {hosts} from '../seed/hosts'
import {HOST_PORTRAITS, POOLS, photoUrl} from '../seed/photos'
import {policies} from '../seed/policies'
import {properties, type PropertySeed} from '../seed/properties'
import {vibeNotes} from '../seed/vibe-notes'

const client = getCliClient({apiVersion: '2026-02-01'}).withConfig({useCdn: false})
const update = process.argv.includes('--update')
const counts: Record<string, {created: number; updated: number; skipped: number}> = {}
const failed: string[] = []

const tally = (type: string, outcome: 'created' | 'updated' | 'skipped') => {
  counts[type] ??= {created: 0, updated: 0, skipped: 0}
  counts[type][outcome]++
}

const ref = (_id: string) => ({_type: 'reference' as const, _ref: _id})

const findId = (type: string, slug: string): Promise<string | null> =>
  client.fetch(`*[_type == $type && slug.current == $slug][0]._id`, {type, slug})

async function upsert(type: string, slug: string, build: () => Promise<Record<string, unknown>>) {
  const existing = await findId(type, slug)
  if (existing && !update) {
    tally(type, 'skipped')
    return existing
  }
  const fields = await build()
  if (existing) {
    await client.patch(existing).set(fields).commit()
    tally(type, 'updated')
    return existing
  }
  const created = await client.create({_type: type, slug: {_type: 'slug', current: slug}, ...fields})
  tally(type, 'created')
  return created._id
}

const assetCache = new Map<string, string>()
async function uploadPhoto(photoId: string) {
  const cached = assetCache.get(photoId)
  if (cached) return cached
  const res = await fetch(photoUrl(photoId))
  if (!res.ok) throw new Error(`photo ${photoId}: HTTP ${res.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {filename: `${photoId}.jpg`})
  assetCache.set(photoId, asset._id)
  return asset._id
}

const image = (assetId: string, alt: string, key?: string) => ({
  _type: 'image' as const,
  ...(key ? {_key: key} : {}),
  asset: ref(assetId),
  alt,
})

// Cover first, then four more from the category pool, spread out so neighbouring stays don't share a gallery.
function galleryFor(p: PropertySeed) {
  const pool = POOLS[p.category]
  const others = pool.filter((id) => id !== p.cover)
  const at = properties.filter((s) => s.category === p.category).findIndex((s) => s.slug === p.slug)
  return [p.cover, ...Array.from({length: 4}, (_, i) => others[(at * 3 + i * 2) % others.length])]
}

async function verifyPhotos() {
  const ids = new Set<string>(HOST_PORTRAITS)
  for (const p of properties) galleryFor(p).forEach((id) => ids.add(id))
  const bad = new Set<string>()
  await Promise.all(
    [...ids].map(async (id) => {
      const res = await fetch(photoUrl(id, 200), {method: 'HEAD'}).catch(() => null)
      if (!res?.ok) bad.add(id)
    }),
  )
  return bad
}

async function main() {
  console.log(`Seeding project ${client.config().projectId} / ${client.config().dataset} (${update ? 'update' : 'create-missing'} mode)`)

  const badPhotos = await verifyPhotos()
  if (badPhotos.size) console.warn(`Unreachable photos: ${[...badPhotos].join(', ')}`)

  const policyIds = new Map<string, string>()
  for (const p of policies) {
    const id = await upsert('policy', p.slug, async () => ({
      title: p.title,
      kind: p.kind,
      summary: p.summary,
      body: p.body,
      ...(p.refundWindowDays !== undefined ? {refundWindowDays: p.refundWindowDays} : {}),
    }))
    policyIds.set(p.slug, id)
  }

  const hostIds = new Map<string, string>()
  for (const h of hosts) {
    const portrait = HOST_PORTRAITS[h.portrait]
    if (badPhotos.has(portrait)) {
      failed.push(`host ${h.slug}: portrait unreachable`)
      continue
    }
    const id = await upsert('host', h.slug, async () => ({
      name: h.name,
      isSuperhost: h.isSuperhost,
      hostingSince: h.hostingSince,
      bio: h.bio,
      photo: image(await uploadPhoto(portrait), `Portrait of ${h.name}`),
    }))
    hostIds.set(h.slug, id)
  }

  for (const p of properties) {
    const gallery = galleryFor(p)
    const missing = gallery.filter((id) => badPhotos.has(id))
    const hostId = hostIds.get(p.host)
    if (missing.length || !hostId) {
      failed.push(`${p.slug}: ${missing.length ? `unreachable photos ${missing.join(', ')}` : `host ${p.host} missing`}`)
      continue
    }
    const sharedPolicies = ['house-rules', 'check-in-and-check-out', 'payments-and-fees', 'safety-and-property']
    if (p.pets) sharedPolicies.splice(1, 0, 'pet-policy')

    const existing = await findId('property', p.slug)
    if (existing && !update) {
      // Fields added after the first seed: fill them in when missing, never overwrite an editor's value.
      await client.patch(existing).setIfMissing({vibeNotes: vibeNotes[p.slug]}).commit()
    }

    await upsert('property', p.slug, async () => {
      const assets = await Promise.all(gallery.map(uploadPhoto))
      return {
        title: p.title,
        category: p.category,
        location: {city: p.city, state: p.state, country: 'US'},
        coordinates: {_type: 'geopoint', lat: p.coords[0], lng: p.coords[1]},
        nightlyPrice: p.price,
        cleaningFee: p.cleaningFee,
        minNights: p.minNights,
        maxGuests: p.guests,
        bedrooms: p.bedrooms,
        beds: p.beds,
        bathrooms: p.bathrooms,
        petsAllowed: p.pets,
        amenities: p.amenities,
        checkInTime: p.checkIn,
        checkOutTime: p.checkOut,
        rating: p.rating,
        reviewCount: p.reviews,
        vibeNotes: vibeNotes[p.slug],
        summary: p.summary,
        description: p.description,
        neighborhood: p.neighborhood,
        images: assets.map((a, i) => image(a, `${p.title}, photo ${i + 1} of ${assets.length}`, `photo-${i + 1}`)),
        host: ref(hostId),
        cancellationPolicy: ref(policyIds.get(p.cancellation)!),
        policies: sharedPolicies.map((slug) => ({_key: slug, ...ref(policyIds.get(slug)!)})),
      }
    })
  }

  console.table(counts)
  if (failed.length) {
    console.error(`Skipped ${failed.length} document(s):\n- ${failed.join('\n- ')}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
