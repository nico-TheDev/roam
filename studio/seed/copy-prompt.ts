// What the model is told when it writes a stay's copy. Shared by scripts/generate-copy.ts and the host API route
// (src/app/api/host/stays+api.ts) so the rules can't drift. Pure: no imports from Sanity or Node.
import {AMENITY_LABELS, STATE_NAMES, type Facts, type Problem} from './check-copy'

export const INSTRUCTION_VERSION = 1

// Records which facts the current copy was written from. SHA-1 via Web Crypto (Node scripts and API routes both have it),
// same digest as before this file existed, so stored hashes stay valid.
export const hashOf = async (f: Facts): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify([INSTRUCTION_VERSION, f]))
  const digest = await globalThis.crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

// What the model sees. Nothing else about the stay is passed in.
export const factSheet = (f: Facts) =>
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

export const INSTRUCTION = `
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

export const problemsBlock = (problems: Problem[]) =>
  problems.length
    ? `\nA previous attempt broke these rules, so avoid them:\n${problems.map((p) => `- ${p.field}: ${p.detail}`).join('\n')}`
    : ''
