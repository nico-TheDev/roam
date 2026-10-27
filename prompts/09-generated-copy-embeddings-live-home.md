# 09 · Generated copy, dataset embeddings and live Home

Status: done

Builds on `08-content-model.md` (the `property` / `host` / `policy` types, the seed in `studio/seed/` and `studio/scripts/seed.ts`, hosted Studio `roam-rentals-a4so5rrr.sanity.studio`) and `07-home-search-tabs.md` (Home currently imports `src/data/properties.ts`). Sanity project `a4so5rrr`, dataset `production` (public), deployed schema id `_.schemas.default`.

## Goal
Each stay's `summary`, `description` and `neighborhood` are written by Sanity Agent Actions from that stay's own facts only, checked by code for invented claims, and published only when they pass. Dataset Embeddings are on and return sensible semantic rankings. The Home tab shows live stays from Sanity (with loading, error and empty states) instead of local data.

## Decisions
Answers from the question round:
- **What counts as facts:** the typed fields plus a new `vibeNotes` field (short plain statements about how the stay feels and what surrounds it). Copy may use only those.
- **Invention check:** code, on every claim. No LLM judge, no Jev here, no new dependency.
- **Home reads Sanity from:** a small fetch wrapper `src/lib/stays.ts` against the public CDN (the dataset is public, nothing secret is involved). No `@sanity/client` in the app.
- **Rollout:** Agent Actions write drafts, code checks each draft, passing drafts are published, failing drafts are discarded and the current copy stays.

Defaults I picked:
- **Honest starting point:** the copy seeded in plan 08 contains details no typed field backs (for example "manta rays", "arcade cabinet", "bikes are included", "a chef can be booked"). The generated copy replaces it for every stay that passes. Stays that fail keep the old copy and are listed, so nothing half-checked goes live unnoticed. Step 2 first runs the checker on the current copy to report how many of the 30 would fail.
- **Schema change (additive, nothing deleted, approved by approving this plan):** on `property`, in the "Descriptive text" group, `vibeNotes` (array of strings, 3 to 6 each, each one plain fact, max 140 characters, e.g. "No neighbors in sight.", "The last mile of road is gravel.", "Ten minutes to the village for restaurants.") and `copyFactsHash` (string, `readOnly`, the hash of the facts the current copy was generated from). Redeploy schema and Studio afterwards (`npx sanity schema deploy`, `npx sanity deploy`, never MCP `deploy_schema`).
- **Seeded notes:** I write `vibeNotes` for all 30 stays in `studio/seed/properties.ts`, using only what the existing seed already says about each stay's feel and surroundings and nothing more. The seed script fills `vibeNotes` on existing documents when the field is missing (patch `setIfMissing`), so it still creates nothing on a second run. These notes are seed content you can edit in Studio; they are the only place "quiet", "cozy" and "secluded" come from.
- **Facts given to Generate** (GROQ `instructionParams`, nothing else): `title`, `category`, `location.city` / `state`, `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `petsAllowed`, `amenities` (as labels), `minNights`, `checkInTime`, `checkOutTime`, `vibeNotes`. Price, rating, reviews and the host are left out (they change and are shown elsewhere in the UI).
- **Instruction (fixed text in `studio/scripts/generate-copy.ts`):** write only from `$facts`; do not add any place, attraction, distance, number, amenity, feature, brand or person that is not in `$facts`; no superlatives or sales language; use quiet, cozy, secluded, romantic or family-friendly only when a note says so; write fewer sentences rather than padding. Limits: `summary` 1 to 2 sentences and at most 300 characters, `description` 3 to 5 sentences, `neighborhood` 2 to 3 sentences. The action targets only those three paths.
- **The check (pure function in `studio/seed/check-copy.ts`, hard fail on any of these):**
  1. Every number, number word ("twelve") and clock time in the copy must equal a number in the facts (guests, bedrooms, beds, bathrooms, minimum nights, check-in/out, or a note).
  2. Every capitalized word that is not at the start of a sentence must appear in the facts (city, state name, title, notes).
  3. Every amenity mention (hot tub, pool, fireplace, Wi-Fi, workspace or desk, kitchen, EV charger, BBQ or grill, fire pit, each kind of view, beach access) must be in the stay's `amenities` or in a note. Mentioning one the stay doesn't have fails.
  4. Pets: any mention of pets, dogs or cats needs `petsAllowed == true` or a note. Saying pets are welcome on a stay where they aren't fails.
  5. Soft words (quiet, cozy, secluded, romantic, family-friendly, modern, luxurious and their close synonyms) each need a note containing that word or a listed synonym.
  6. Banned sales words (perfect, stunning, breathtaking, unforgettable, best, ultimate, dream, hidden gem and similar).
  7. Length limits above, and no empty field.
  Soft fail, reported but not blocking: more than 3 content words in one field that appear nowhere in the facts or a short neutral-word list. If tuning the rules is needed after looking at real output, the plan Result says exactly what changed and why.
- **Retry:** one retry per stay, feeding the failed rules back as `$problems`. After that the stay keeps its current copy and is reported.
- **Idempotent re-runs:** the script stores `copyFactsHash` on publish and skips a stay whose facts hash is unchanged; `--force` regenerates, `--only <slug>` runs one stay, `--dry` generates and checks without publishing (drafts are discarded). It uses `sanity exec ... --with-user-token`, so no secret is stored.
- **Embeddings:** enable on `production` with a projection that only embeds stays and only text about the stay itself (references are not followed): `{ _type == "property" => { title, "place": location.city, category, summary, description, neighborhood, vibeNotes } }`. Hosts and policies are not embedded, so policy text can't surface in stay rankings. Enabled through the CLI (`datasets embeddings enable production --projection=... --wait`), checked with `datasets embeddings status`.
- **Using them:** ranking only, never filtering: `*[hard filters as params] | score(text::semanticSimilarity($q)) | order(_score desc)`. This plan only proves it with test queries. The Search tab stays on `searchProperties` (local) and is switched in a later plan, together with the API route and Jev.
- **Home query:** one request returns the top 12 per category plus "all", ordered by `rating desc, reviewCount desc`, with `{ "id": _id, title, category, "city": location.city, "state": location.state, rating, "imageUrl": images[0].asset->url }`. The category chips then switch instantly on the client with no extra request. Values are fixed in code (no user text reaches the query), and the published perspective is what the CDN serves, so drafts never appear.
- **Images:** `imageUrl` is the asset URL with `?w=1000&q=80&auto=format` (no `@sanity/image-url`).
- **Config:** `EXPO_PUBLIC_SANITY_PROJECT_ID` and `EXPO_PUBLIC_SANITY_DATASET` (public values, not secrets), names added to `.env.example`, values to `.env.local`.
- **States on Home:** loading (placeholder blocks in the featured area, header and chips render immediately), error (the existing `Alert` plus a "Try again" `Button`), empty for a category ("No stays here yet"). A new shared component, if one is needed, is added to the `/design-system` route.
- **Types:** `Category` is still imported from `src/data/properties.ts` until the local data is retired in the Search plan.

## Out of scope
- Search results from Sanity, the API route, Jev, and wiring `score()` into the app.
- The stay details screen, Trips, favorites, and tapping a Home card.
- The Sanity Context (Knowledge Base) endpoint for policy answers.
- Rewriting host bios or policy text with Agent Actions.
- Review of the copy by a human editor (the drafts are checked by code only; you can read them in Studio).

## Steps
### 1. Schema fields and seeded notes
Add `vibeNotes` and `copyFactsHash` to `studio/schemaTypes/property.ts`. Write `vibeNotes` for all 30 stays in `studio/seed/properties.ts` and make `studio/scripts/seed.ts` patch them in with `setIfMissing` on existing documents. Redeploy schema and Studio with the CLI. Done when `npx sanity schema validate` and `cd studio && npx tsc --noEmit` pass, `get_schema` shows both fields, the seed run reports the notes added once, and a second run changes nothing.

### 2. Checker, then generated copy
Write `studio/seed/check-copy.ts` and a self-test (`studio/scripts/check-copy-selftest.ts`) with known-bad samples that must fail (an amenity the stay doesn't have, a made-up place, a wrong number, "pets welcome" on a no-pets stay, an unsupported "secluded", a banned word) and known-good ones that must pass. First run the checker on today's seeded copy and report how many of the 30 fail and why. Then write `studio/scripts/generate-copy.ts` (Generate with `apiVersion: 'vX'`, schema id `_.schemas.default`, draft, check, one retry, publish passes, discard failures, `--dry`, `--only`, `--force`). Read the current Generate docs and HTTP reference first; the API is experimental. Run `--dry` on two stays, read the output with you in the terminal, then run all 30. Done when the report lists every stay as published or kept-old with reasons, no `drafts.*` documents remain, and a second run skips all published stays.

### 3. Dataset embeddings
Enable embeddings with the projection above, wait for `ready`, and prove ranking with MCP `query_documents`. Done when status is `ready` and the Verification queries below return plausible orders.

### 4. Live Home
Create `src/lib/stays.ts` (`getFeaturedStays()` returning `Record<Category | "all", FeaturedStay[]>`, a `useFeaturedStays()` hook with `status: "loading" | "error" | "ready"`, abort on unmount and a `retry`) and update `src/app/(tabs)/home.tsx` to use it with the three states. Add `.env.example` names. Remove Home's import of `src/data/properties.ts` (Search still uses it). Done when `npx tsc --noEmit` and `npx expo lint` pass and Home shows live stays on the simulator.

### 5. Visual and state check
Run the app per AGENTS.md "Visual checks", screenshot Home with live data in light and dark, and compare with `assets/prompt-imgs/home.png`. Force the error state with a wrong project id and the empty state with a category that returns nothing (temporary, reverted), and screenshot both.

## Verification
- `cd studio && npx sanity schema validate`, `npx tsc --noEmit` (studio), root `npx tsc --noEmit` and `npx expo lint` pass.
- Checker self-test: every known-bad sample fails with the right rule, every known-good passes.
- Baseline: how many of the 30 current copies fail the checker, with reasons (reported, not hidden).
- Generation report: per stay `published` or `kept old` with the failed rules. No `drafts.*` documents left (`count(*[_id in path("drafts.**")]) == 0`). Published copy re-checked from Sanity by the same function: 0 failures among published stays.
- Spot reading of 3 generated stays against their facts: nothing in the copy that the facts don't say.
- Second `generate-copy.ts` run: all skipped. Second seed run: 0 created.
- `datasets embeddings status production` is `ready`. Test queries (hard filters as params, then `score(text::semanticSimilarity(...))`): "quiet secluded cabin, no neighbors" ranks Secluded Forest Lodge or A-Frame in the Redwoods or Treehouse Cabin near the top; "lively city loft near nightlife" ranks city stays above cabins; "family beach house with a pool" ranks Outer Banks, Gulf Cottage or Sunset Beach House near the top; a query with filters (`petsAllowed == true && nightlyPrice <= 300`) never returns a stay outside them. Report the actual top 5 of each, even where the order is not what was expected.
- Home on the simulator: live featured stays, chips switch instantly with no request (check the network log or a counter), loading, error and empty states shown, light and dark.
- End to end: edit a stay's `vibeNotes` in Studio, rerun `generate-copy.ts --only <slug>`, see the copy and `copyFactsHash` change and the Home card unaffected; revert the note.
- Not verifiable here: semantic ranking quality on real guest phrasing (30 stays and test queries only), and Home on a slow network or a release build. Report both as unchecked.

## AGENTS.md updates
- **Who owns what, Content:** add `vibeNotes` and `copyFactsHash`, and that `summary` / `description` / `neighborhood` are generated by Agent Actions from the stay's facts only and published only after `studio/seed/check-copy.ts` passes (`cd studio && npx sanity exec scripts/generate-copy.ts --with-user-token`).
- **Who owns what, Soft intent:** Dataset Embeddings are enabled on `production` with the projection above (property text only, no references), checked with `datasets embeddings status`.
- **Rules:** replace "Until Sanity and Jev exist, `src/data/properties.ts` ... stand in" with: Home reads Sanity through `src/lib/stays.ts`, Search still uses `parseQuery` / `searchProperties` on local data until its own plan.
- **Design system:** Home states (loading, error, empty), and any new shared component.

## Result
Built as planned, with these changes:
- **No drafts:** Generate runs with `noWrite: true` against a new in-memory property, so the model never sees the stay's old copy and failing copy is never stored. Passing copy is patched onto the published document. A stay with an unpublished Studio draft is skipped.
- **Lengths:** `description` and `neighborhood` have maximums only (5 and 3 sentences), no minimum, so sparse facts are never padded.
- **Notes file:** `vibeNotes` live in `studio/seed/vibe-notes.ts` (keyed by slug), not in `properties.ts`.
- **Checker fix mid-run:** the first full run kept 2 stays old because a `tub` feature word rejected "hot tub" on stays that list a hot tub. Fixed (specific tub words, features matched against all facts), two self-test cases added, the 2 stays regenerated.
- **Baseline:** 29 of 30 seeded copies failed the checker (most: unlisted features such as bed types, terraces and porches; places such as Haystack Rock, Dollywood and the Channel Islands; "perfect" and "best"). After generation, 30 of 30 published copies pass.
- **Checked on the simulator:** live Home (light and dark) and the error state, with the auth guard opened temporarily and restored, `.env.local` restored. Not run: loading and empty states (code only).
- **Quality notes:** generated copy is faithful but plain, with some clumsy phrasing ("SoHo, New York, New York"). Ranking scores are close together (about 6.7 to 8.0), so semantic ranking separates clear intents (secluded cabin, city loft) better than subtle ones ("peaceful romantic getaway" put Modern Cabin with Hot Tub first). The Home cover for Modern Cabin with Hot Tub is an Unsplash log cabin in a forest, which doesn't match the "modern" title.
