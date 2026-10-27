// Known-bad samples must fail with the right rule, known-good ones must pass.
//   cd studio && npx sanity exec scripts/check-copy-selftest.ts
import {checkCopy, type Copy, type Facts} from '../seed/check-copy'

const cabin: Facts = {
  title: 'Secluded Forest Lodge', category: 'cabin', city: 'Bend', state: 'OR', maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 1.5,
  petsAllowed: true, amenities: ['fireplace', 'wifi', 'forest-view', 'fire-pit'], minNights: 2, checkInTime: '15:00', checkOutTime: '11:00',
  vibeNotes: [
    'Secluded and quiet, on five wooded acres with no neighbors in sight.',
    'Cozy great room built around a big stone fireplace.',
    'Dogs are welcome and the trails start at the back gate.',
    'Twenty minutes to downtown Bend for breweries and the Deschutes River.',
    'The last mile is gravel.',
  ],
}
const city: Facts = {
  title: 'Downtown Studio with Skyline View', category: 'city', city: 'Seattle', state: 'WA', maxGuests: 2, bedrooms: 0, beds: 1, bathrooms: 1,
  petsAllowed: false, amenities: ['wifi', 'workspace', 'skyline-view', 'kitchen'], minNights: 1, checkInTime: '15:00', checkOutTime: '11:00',
  vibeNotes: ['Modern and quiet studio on a high floor.', 'The building has a gym and a rooftop terrace.', 'Two blocks from Pike Place Market and the waterfront.'],
}

const good = (summary: string, description = 'It sleeps four across two bedrooms.', neighborhood = 'Bend is twenty minutes away.'): Copy => ({summary, description, neighborhood})

const cases: {name: string; facts: Facts; copy: Copy; expect: 'pass' | string}[] = [
  {name: 'faithful copy passes', facts: cabin, expect: 'pass', copy: good(
    'A secluded, quiet lodge on five wooded acres near Bend, with a stone fireplace and no neighbors in sight.',
    'It sleeps four across two bedrooms, with a cozy great room built around the fireplace and a fire pit outside. Dogs are welcome.',
    'Downtown Bend, with its breweries and the Deschutes River, is twenty minutes away. The last mile is gravel.')},
  {name: 'amenity the stay lacks', facts: cabin, expect: 'amenity', copy: good('A secluded lodge with a hot tub near Bend.')},
  {name: 'made-up place', facts: cabin, expect: 'proper-noun', copy: good('A secluded lodge near Bend and Mount Bachelor.')},
  {name: 'wrong number', facts: cabin, expect: 'number', copy: good('A secluded lodge near Bend that sleeps eight.')},
  {name: 'wrong number as a word in the neighborhood', facts: cabin, expect: 'number', copy: good('A secluded lodge near Bend.', 'It sleeps four.', 'Bend is ten minutes away.')},
  {name: 'pets welcome where they are not', facts: city, expect: 'pets', copy: good('A modern studio in Seattle where dogs are welcome.')},
  {name: 'saying pets are not allowed is fine', facts: city, expect: 'pass', copy: good('A modern, quiet studio in Seattle with a skyline view. Pets are not allowed.', 'It has a kitchen and a workspace.', 'Pike Place Market is two blocks away.')},
  {name: 'unsupported soft word', facts: city, expect: 'soft-word', copy: good('A romantic studio in Seattle.')},
  {name: 'unsupported secluded', facts: city, expect: 'soft-word', copy: good('A secluded studio in Seattle.')},
  {name: 'banned sales word', facts: cabin, expect: 'sales-language', copy: good('A stunning lodge near Bend.')},
  {name: 'invented feature', facts: cabin, expect: 'feature', copy: good('A secluded lodge near Bend with a wraparound deck.')},
  {name: 'invented bed type', facts: city, expect: 'feature', copy: good('A modern studio in Seattle with a queen bed.')},
  {name: 'feature the notes do name passes', facts: city, expect: 'pass', copy: good('A modern studio in Seattle with a rooftop terrace and a gym in the building.', 'It has a skyline view.', 'Pike Place Market is two blocks away.')},
  {name: 'a listed hot tub is not an invented tub', facts: {...cabin, amenities: [...cabin.amenities, 'hot-tub']}, expect: 'pass', copy: good('A secluded, quiet lodge near Bend with a hot tub.', 'It sleeps four.', 'Bend is twenty minutes away.')},
  {name: 'invented soaking tub', facts: cabin, expect: 'feature', copy: good('A secluded lodge near Bend with a soaking tub.')},
  {name: 'too many sentences in the summary', facts: cabin, expect: 'length', copy: good('A lodge near Bend. It is quiet. It has a fireplace.')},
  {name: 'empty field', facts: cabin, expect: 'length', copy: good('A secluded lodge near Bend.', '')},
]

let failed = 0
for (const c of cases) {
  const {problems} = checkCopy(c.copy, c.facts)
  const rules = [...new Set(problems.map((p) => p.rule))]
  const ok = c.expect === 'pass' ? problems.length === 0 : rules.includes(c.expect)
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name}${ok ? '' : `  expected ${c.expect}, got ${problems.length ? problems.map((p) => `${p.rule}: ${p.detail}`).join(' | ') : 'no problems'}`}`)
}
console.log(failed ? `${failed} of ${cases.length} failed` : `all ${cases.length} passed`)
process.exitCode = failed ? 1 : 0
