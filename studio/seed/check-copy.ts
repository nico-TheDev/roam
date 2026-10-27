// Checks generated copy against the facts it was written from. Pure functions, no network.
// A stay's facts are its typed fields plus vibeNotes. Anything the copy says beyond them is an invention.

export type Facts = {
  title: string
  category: string
  city: string
  state: string
  maxGuests: number
  bedrooms: number
  beds: number
  bathrooms: number
  petsAllowed: boolean
  amenities: string[]
  minNights: number
  checkInTime: string
  checkOutTime: string
  vibeNotes: string[]
}

export type Copy = {summary: string; description: string; neighborhood: string}
export type Field = keyof Copy
export type Problem = {field: Field; rule: string; detail: string}
export type Result = {problems: Problem[]; warnings: Problem[]}

export const AMENITY_LABELS: Record<string, string> = {
  'hot-tub': 'hot tub',
  pool: 'pool',
  fireplace: 'fireplace',
  'ocean-view': 'ocean view',
  'forest-view': 'forest view',
  'mountain-view': 'mountain view',
  'lake-view': 'lake view',
  'skyline-view': 'skyline view',
  wifi: 'Wi-Fi',
  workspace: 'workspace',
  kitchen: 'kitchen',
  'air-conditioning': 'air conditioning',
  'ev-charger': 'EV charger',
  bbq: 'BBQ',
  'fire-pit': 'fire pit',
  'beach-access': 'beach access',
}

export const STATE_NAMES: Record<string, string> = {
  CA: 'California', OR: 'Oregon', CO: 'Colorado', HI: 'Hawaii', FL: 'Florida', NY: 'New York', WA: 'Washington',
  TX: 'Texas', NC: 'North Carolina', MT: 'Montana', TN: 'Tennessee', IL: 'Illinois', LA: 'Louisiana',
}

// What each amenity looks like in prose. A mention is fine when the stay lists the amenity or a note says the same thing.
const AMENITY_MENTIONS: Record<string, RegExp> = {
  'hot-tub': /\bhot[- ]?tubs?\b|\bspa\b|\bjacuzzi\b/i,
  pool: /\b(?:swimming )?pools?\b(?! table)|\bplunge pool\b/i,
  fireplace: /\bfireplaces?\b|\bwood[- ]?stove\b|\bhearth\b/i,
  'ocean-view': /\b(?:ocean|sea|pacific)[- ]?(?:views?|facing|front)\b|\bviews? (?:of|over|across|to) the (?:ocean|sea|pacific)\b|\boceanfront\b/i,
  'forest-view': /\bforest[- ]?views?\b|\bviews? (?:of|over) the (?:forest|trees|pines|redwoods)\b/i,
  'mountain-view': /\bmountain[- ]?views?\b|\bviews? (?:of|over|to|toward|towards) the (?:mountains?|ridges?|ridgelines?|cascades|rockies)\b/i,
  'lake-view': /\blake[- ]?views?\b|\bviews? (?:of|over|across|to) the lake\b/i,
  'skyline-view': /\bskyline[- ]?views?\b|\bviews? (?:of|over) the (?:skyline|city)\b/i,
  wifi: /\bwi-?fi\b|\binternet\b|\bfast connection\b|\bconnection\b/i,
  workspace: /\bwork ?spaces?\b|\bdesks?\b|\bwork areas?\b|\bremote work\b/i,
  kitchen: /\bkitchen(?:ette)?s?\b/i,
  'air-conditioning': /\bair[- ]?condition\w*\b|\ba\/c\b|\bcooling\b/i,
  'ev-charger': /\bev charger\b|\belectric[- ]vehicle\b|\bcharging station\b/i,
  bbq: /\bbbq\b|\bbarbecue\b|\bgrill\b/i,
  'fire-pit': /\bfire[- ]?pits?\b/i,
  'beach-access': /\bbeach access\b|\baccess to the beach\b|\bsteps? (?:from|to) the (?:beach|sand|water)\b/i,
}

// Physical features and furnishings that are not amenity values: each must appear in the facts (title, notes or an amenity label).
const FEATURE_WORDS = [
  'deck', 'patio', 'porch', 'courtyard', 'terrace', 'balcony', 'rooftop', 'yard', 'garden', 'dock', 'boardwalk',
  'game room', 'gym', 'elevator', 'concierge', 'loft', 'mezzanine', 'bunk', 'bikes', 'kayak', 'paddleboard',
  'boogie', 'longboard', 'surfboard', 'fountain', 'sauna', 'library', 'record player', 'pizza oven', 'misters',
  'garage', 'parking', 'shuttle', 'ski', 'snorkel', 'barn', 'pavilion', 'cellar', 'clawfoot tub', 'soaking tub', 'bathtub', 'shower', 'stove',
  'king bed', 'queen bed', 'twin bed', 'sofa', 'daybed', 'pull-out', 'sleeper', 'arcade', 'pool table', 'shuffleboard',
  'hammock', 'swing', 'rocking chairs', 'lanai', 'wraparound', 'vaulted', 'skylight', 'heated floors',
]

const SOFT_WORDS: {copy: RegExp; support: RegExp; label: string}[] = [
  {label: 'quiet', copy: /\b(?:quiet(?:ly)?|peaceful(?:ly)?|calm|tranquil|serene|silent|stillness)\b/i, support: /quiet|peaceful|calm|tranquil|serene|silent/i},
  {label: 'cozy', copy: /\b(?:cozy|cosy|snug|inviting)\b/i, support: /cozy|cosy|snug|warm/i},
  {label: 'secluded', copy: /\b(?:secluded|seclusion|remote|isolated|hidden|hideaway|off the beaten)\b/i, support: /secluded|hidden|isolated|remote|no neighbors|private/i},
  {label: 'private', copy: /\bprivate(?:ly)?\b/i, support: /private/i},
  {label: 'romantic', copy: /\b(?:romantic|couples?|getaway for two)\b/i, support: /romantic|couples?/i},
  {label: 'family', copy: /\b(?:family|families|kids|children)\b/i, support: /family|families|kids|children/i},
  {label: 'modern', copy: /\b(?:modern|contemporary)\b/i, support: /modern|contemporary/i},
  {label: 'luxury', copy: /\b(?:luxur\w+|upscale|lavish|opulent|elegant|stylish)\b/i, support: /luxur|upscale|lavish|opulent|elegant|stylish/i},
  {label: 'spacious', copy: /\b(?:spacious|roomy|expansive|generous)\b/i, support: /spacious|roomy|big|large|expansive/i},
  {label: 'bright', copy: /\b(?:bright|sunny|sun-?filled|airy)\b/i, support: /bright|sunny|airy|light/i},
  {label: 'charming', copy: /\b(?:charming|quaint|rustic|colorful)\b/i, support: /charming|quaint|rustic|colorful/i},
]

const BANNED =
  /\b(?:perfect(?:ly)?|stunning|breathtaking|unforgettable|best|ultimate|dream|hidden gem|world-class|amazing|incredible|magical|paradise|unbeatable|must-see|iconic|exquisite|unparalleled|gorgeous|spectacular|enchanting)\b/i

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, hundred: 100,
}

const LIMITS: Record<Field, {maxSentences: number; maxChars: number}> = {
  summary: {maxSentences: 2, maxChars: 300},
  description: {maxSentences: 5, maxChars: 900},
  neighborhood: {maxSentences: 3, maxChars: 500},
}

// Words that carry no claim of their own. Only used for the soft "unsupported words" warning.
const NEUTRAL = new Set(
  `this that with from your their there here have has will would could also each every both only just very more most some any
  other another such than then them they these those into onto over under about above below near close short long
  after before while until during between through across along around within without inside outside
  stay stays home house place space guests guest sleeps sleep offers offer features feature includes include enjoy enjoyed
  located location set sits sit made makes provided provide available allow allowed welcome welcomes available
  feel feels makes make take takes need needs want wants like love loved come comes goes gets get find finds
  room rooms bedroom bedrooms bathroom bathrooms bath baths beds bed night nights stay check check-in checkout times time
  area areas neighborhood neighbours neighbors street road side end side level floor ground upper lower main whole entire
  great good nice well easy easily quick quickly right just still even best next last first second third
  small large little many much several few plenty ideal`.split(/\s+/),
)

const stem = (w: string) => w.toLowerCase().replace(/(?:ing|edly|ed|ly|es|s)$/, '').replace(/[^a-z0-9]/g, '')
const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}ʻ][\p{L}\p{N}ʻ'’-]*/gu) ?? []
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)

function numbersIn(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(/\b(\d+)(?::(\d\d))?\s?(?:am|pm|st|nd|rd|th)?\b/gi)) out.push(Number(m[1]))
  for (const w of words(text)) {
    for (const part of w.split('-')) if (part in NUMBER_WORDS) out.push(NUMBER_WORDS[part])
  }
  return out
}

function allowedNumbers(f: Facts, notesText: string): Set<number> {
  const set = new Set<number>([f.maxGuests, f.bedrooms, f.beds, f.bathrooms, f.minNights])
  for (const t of [f.checkInTime, f.checkOutTime]) {
    const hour = Number(t.slice(0, 2))
    set.add(hour)
    set.add(hour % 12 === 0 ? 12 : hour % 12)
  }
  for (const n of numbersIn(notesText)) set.add(n)
  // "two-bedroom" style phrases use the typed counts; half baths are written as a number plus "and a half".
  if (f.bathrooms % 1) set.add(Math.floor(f.bathrooms))
  return set
}

export function factsText(f: Facts): string {
  return [
    f.title,
    f.city,
    STATE_NAMES[f.state] ?? f.state,
    f.category,
    ...f.amenities.map((a) => AMENITY_LABELS[a] ?? a),
    ...f.vibeNotes,
  ].join('. ')
}

export function checkCopy(copy: Copy, f: Facts): Result {
  const problems: Problem[] = []
  const warnings: Problem[] = []
  const notes = f.vibeNotes.join(' ')
  const evidence = `${f.title} ${notes}`
  const allFacts = factsText(f)
  const vocab = new Set(words(allFacts).map(stem))
  const numbersOk = allowedNumbers(f, `${f.title} ${notes}`)
  const fail = (field: Field, rule: string, detail: string) => problems.push({field, rule, detail})

  for (const field of Object.keys(LIMITS) as Field[]) {
    const text = (copy[field] ?? '').trim()
    if (!text) {
      fail(field, 'length', 'empty')
      continue
    }
    const limit = LIMITS[field]
    if (text.length > limit.maxChars) fail(field, 'length', `${text.length} characters, limit ${limit.maxChars}`)
    if (sentences(text).length > limit.maxSentences) fail(field, 'length', `${sentences(text).length} sentences, limit ${limit.maxSentences}`)

    // 1. Numbers
    for (const n of numbersIn(text)) {
      if (!numbersOk.has(n)) fail(field, 'number', `"${n}" is not in the facts`)
    }

    // 2. Proper nouns (capitalized words after the first word of a sentence)
    for (const s of sentences(text)) {
      const tokens = s.match(/[\p{L}ʻ][\p{L}ʻ'’.-]*/gu) ?? []
      tokens.slice(1).forEach((tok) => {
        const clean = tok.replace(/[’']s$/i, '').replace(/[.-]+$/, '')
        if (/^\p{Lu}/u.test(clean) && clean.length > 1 && clean !== 'I' && !vocab.has(stem(clean))) {
          fail(field, 'proper-noun', `"${clean}" is not in the facts`)
        }
      })
    }

    // 3. Amenities
    for (const [key, re] of Object.entries(AMENITY_MENTIONS)) {
      if (re.test(text) && !f.amenities.includes(key) && !re.test(notes) && !re.test(f.title)) {
        fail(field, 'amenity', `mentions ${AMENITY_LABELS[key]}, which the stay does not list`)
      }
    }

    // 3b. Features that are neither amenities nor in the notes
    const lower = text.toLowerCase()
    for (const word of FEATURE_WORDS) {
      const re = new RegExp(`\\b${word.replace(/[- ]/g, '[- ]?')}s?\\b`, 'i')
      if (re.test(lower) && !re.test(allFacts)) fail(field, 'feature', `mentions "${word}", which no note mentions`)
    }

    // 4. Pets
    const petRe = /\b(?:pets?|dogs?|cats?|pet[- ]friendly|puppy|canine)\b/i
    for (const s of sentences(text)) {
      if (!petRe.test(s)) continue
      const denies = /\b(?:no|not|aren['’]t|isn['’]t|don['’]t|cannot|can['’]t)\b/i.test(s)
      const supported = (f.petsAllowed && !denies) || petRe.test(notes) || (!f.petsAllowed && denies)
      if (!supported) fail(field, 'pets', `"${s}" says something about pets the facts do not support`)
    }

    // 5. Soft words
    for (const {copy: re, support, label} of SOFT_WORDS) {
      if (re.test(text) && !support.test(evidence)) fail(field, 'soft-word', `says "${label}", which no note supports`)
    }

    // 6. Sales language
    const banned = text.match(BANNED)
    if (banned) fail(field, 'sales-language', `uses "${banned[0]}"`)

    // Soft: words that appear nowhere in the facts
    const unsupported = [
      ...new Set(
        words(text).filter(
          (w) => w.length >= 5 && !NEUTRAL.has(w) && !vocab.has(stem(w)) && !/^\d/.test(w) && !(w in NUMBER_WORDS),
        ),
      ),
    ]
    if (unsupported.length > 3) warnings.push({field, rule: 'unsupported-words', detail: unsupported.join(', ')})
  }
  return {problems, warnings}
}
