// Writes summary, description and neighborhood for each stay with Sanity Agent Actions (Generate), from that stay's own facts only.
// Generated copy is checked by seed/check-copy.ts and written only when it passes. Failing copy is never written.
//   cd studio && npx sanity exec scripts/generate-copy.ts --with-user-token -- [--baseline] [--dry] [--force] [--only <slug>]
// --baseline  check the copy that is in the dataset now and generate nothing
// --dry       generate and check, write nothing
// --force     regenerate stays whose facts have not changed
// --only      one stay, by slug
import {createHash} from 'node:crypto'
import {getCliClient} from 'sanity/cli'
import {AMENITY_LABELS, checkCopy, type Copy, type Facts, type Problem} from '../seed/check-copy'

const INSTRUCTION_VERSION = 1
const SCHEMA_ID = '_.schemas.default'
const STATE_NAMES: Record<string, string> = {
  CA: 'California', OR: 'Oregon', CO: 'Colorado', HI: 'Hawaii', FL: 'Florida', NY: 'New York', WA: 'Washington',
  TX: 'Texas', NC: 'North Carolina', MT: 'Montana', TN: 'Tennessee', IL: 'Illinois', LA: 'Louisiana',
}

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined

const client = getCliClient({apiVersion: 'vX'}).withConfig({useCdn: false})

type Row = Facts & {_id: string; slug: string; summary?: string; description?: string; neighborhood?: string; copyFactsHash?: string}

const QUERY = `*[_type == "property" && (!defined($only) || slug.current == $only)] | order(slug.current asc){
  _id, "slug": slug.current, title, category, "city": location.city, "state": location.state,
  maxGuests, bedrooms, beds, bathrooms, petsAllowed, amenities, minNights, checkInTime, checkOutTime,
  "vibeNotes": coalesce(vibeNotes, []), summary, description, neighborhood, copyFactsHash
}`

const factsOf = (r: Row): Facts => ({
  title: r.title, category: r.category, city: r.city, state: r.state, maxGuests: r.maxGuests, bedrooms: r.bedrooms,
  beds: r.beds, bathrooms: r.bathrooms, petsAllowed: r.petsAllowed, amenities: r.amenities ?? [], minNights: r.minNights,
  checkInTime: r.checkInTime, checkOutTime: r.checkOutTime, vibeNotes: r.vibeNotes,
})

const hashOf = (f: Facts) => createHash('sha1').update(JSON.stringify([INSTRUCTION_VERSION, f])).digest('hex').slice(0, 16)

// What the model sees. Nothing else about the stay is passed in.
const factSheet = (f: Facts) =>
  JSON.stringify(
    {
      name: f.title,
      type: f.category,
      place: `${f.city}, ${STATE_NAMES[f.state] ?? f.state}`,
      sleeps: f.maxGuests,
      bedrooms: f.bedrooms === 0 ? 'studio' : f.bedrooms,
      beds: f.beds,
      bathrooms: f.bathrooms,
      pets: f.petsAllowed ? 'allowed' : 'not allowed',
      amenities: f.amenities.map((a) => AMENITY_LABELS[a] ?? a),
      minimumNights: f.minNights,
      checkIn: f.checkInTime,
      checkOut: f.checkOutTime,
      notes: f.vibeNotes,
    },
    null,
    2,
  )

const INSTRUCTION = `
Write three short texts for a rental stay: summary, description and neighborhood. The only source is the fact sheet in $facts.
Do not use anything else you know or can guess, and ignore any text already in the document.

Rules:
- Use only what is in $facts. Never add a place, attraction, distance, number, amenity, feature, furniture, brand, person or event that is not written there.
- Say a stay is quiet, cozy, secluded, romantic, modern, luxurious or family-friendly only if a note says so.
- Mention pets only as the fact sheet states them.
- No superlatives or sales language (perfect, stunning, best, dream, amazing and the like). Plain, specific, friendly sentences in a guest's words.
- Write fewer sentences rather than padding. A short true text beats a long one.
- summary: 1 to 2 sentences, at most 300 characters, what kind of stay it is and how it feels.
- description: at most 5 sentences, the stay itself (rooms, beds, amenities, feel).
- neighborhood: at most 3 sentences, the surroundings and getting around, using only the notes and the place.
$problems
`.trim()

const problemsBlock = (problems: Problem[]) =>
  problems.length
    ? `\nA previous attempt broke these rules, so avoid them:\n${problems.map((p) => `- ${p.field}: ${p.detail}`).join('\n')}`
    : ''

async function generate(r: Row, problems: Problem[]): Promise<Copy> {
  const result = (await client.agent.action.generate({
    schemaId: SCHEMA_ID,
    // A new in-memory document with noWrite: the model never sees this stay's old copy, and nothing is stored.
    targetDocument: {operation: 'create', _type: 'property'},
    noWrite: true,
    instruction: INSTRUCTION,
    instructionParams: {
      facts: {type: 'constant', value: factSheet(factsOf(r))},
      problems: {type: 'constant', value: problemsBlock(problems) || 'No earlier problems.'},
    },
    target: {include: ['summary', 'description', 'neighborhood']},
    temperature: 0.2,
  })) as Partial<Copy>
  return {summary: result.summary ?? '', description: result.description ?? '', neighborhood: result.neighborhood ?? ''}
}

const histogram = new Map<string, number>()
const note = (problems: Problem[]) => problems.forEach((p) => histogram.set(p.rule, (histogram.get(p.rule) ?? 0) + 1))
const brief = (problems: Problem[]) => [...new Set(problems.map((p) => `${p.field}/${p.rule}: ${p.detail}`))].slice(0, 4).join('; ')

async function main() {
  const rows: Row[] = await client.fetch(QUERY, {only: only ?? null})
  if (!rows.length) throw new Error(only ? `No stay with slug ${only}` : 'No stays found')
  console.log(`${rows.length} stay(s), mode: ${flag('baseline') ? 'baseline' : flag('dry') ? 'dry run' : 'write'}${flag('force') ? ', force' : ''}`)

  const report: {slug: string; outcome: string; detail: string}[] = []

  for (const r of rows) {
    const facts = factsOf(r)
    const hash = hashOf(facts)

    if (flag('baseline')) {
      const {problems} = checkCopy({summary: r.summary ?? '', description: r.description ?? '', neighborhood: r.neighborhood ?? ''}, facts)
      note(problems)
      report.push({slug: r.slug, outcome: problems.length ? 'FAILS' : 'passes', detail: brief(problems)})
      continue
    }

    if (r.copyFactsHash === hash && !flag('force')) {
      report.push({slug: r.slug, outcome: 'skipped', detail: 'facts unchanged since the current copy was generated'})
      continue
    }
    if (await client.fetch('defined(*[_id == $id][0]._id)', {id: `drafts.${r._id}`})) {
      report.push({slug: r.slug, outcome: 'skipped', detail: 'has an unpublished draft in Studio, left alone'})
      continue
    }

    let problems: Problem[] = []
    let copy: Copy | undefined
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        copy = await generate(r, problems)
      } catch (err) {
        report.push({slug: r.slug, outcome: 'kept old', detail: `generate failed: ${(err as Error).message}`})
        copy = undefined
        break
      }
      const result = checkCopy(copy, facts)
      problems = result.problems
      if (!problems.length) {
        if (result.warnings.length) console.log(`  note ${r.slug}: ${result.warnings.map((w) => `${w.field} words not in facts: ${w.detail}`).join(' | ')}`)
        break
      }
      note(problems)
      console.log(`  ${r.slug} attempt ${attempt}: ${brief(problems)}`)
    }
    if (!copy) continue
    if (problems.length) {
      report.push({slug: r.slug, outcome: 'kept old', detail: brief(problems)})
      continue
    }
    if (flag('dry')) {
      console.log(`\n--- ${r.slug}\nsummary: ${copy.summary}\ndescription: ${copy.description}\nneighborhood: ${copy.neighborhood}\n`)
      report.push({slug: r.slug, outcome: 'would publish', detail: 'dry run'})
      continue
    }
    await client.patch(r._id).set({...copy, copyFactsHash: hash}).commit()
    report.push({slug: r.slug, outcome: 'published', detail: ''})
  }

  console.table(report)
  const counts = report.reduce<Record<string, number>>((acc, x) => ((acc[x.outcome] = (acc[x.outcome] ?? 0) + 1), acc), {})
  console.log('Totals:', counts)
  if (histogram.size) console.log('Rules hit:', Object.fromEntries([...histogram].sort((a, b) => b[1] - a[1])))
  if (report.some((x) => x.outcome === 'kept old' || x.outcome === 'FAILS')) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
