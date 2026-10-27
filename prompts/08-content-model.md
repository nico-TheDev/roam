# 08 · Content model, schema deploy and seed

Status: done

Designs: `assets/prompt-imgs/search.png` and `assets/prompt-imgs/property-details.png` (the details screen is not built yet; this plan only models its data). Builds on `07-home-search-tabs.md` (the local `Property` type in `src/data/properties.ts` and `src/lib/search.ts` are what this replaces later). Sanity project `a4so5rrr`, dataset `production`, Studio in `studio/` (`schemaTypes/index.ts` is empty, the dataset has no content).

## Goal
Sanity holds three document types, `property`, `host` and `policy`, with typed fields for everything guests filter on and descriptive text on the property for embeddings. The schema is deployed through the Sanity MCP, and 30 realistic stays (with hosts, policies and 5 photos each) are seeded by a script that can run any number of times without duplicating anything.

## Decisions
Answers from the question round:
- **Stay details carries:** long description and bedrooms/beds/bathrooms, check-in and check-out times, map coordinates, and a neighborhood / "good to know" text.
- **Photos:** real Sanity image assets, 5 per stay. The seed uploads them from Unsplash (150 uploads; Sanity dedupes identical files, so re-runs don't add assets).
- **Pricing:** nightly price, cleaning fee and minimum nights as typed numbers. Totals ("$867 total") are computed in code from dates, never stored.
- **Reviews:** `rating` and `reviewCount` on the stay. No review documents.

Defaults I picked:
- **Three document types:** `property`, `host`, `policy`. Hosts and policies are shared, so a stay references one host, one cancellation policy and a list of other policies. Editing a policy once updates every stay that uses it.
- **Typed (GROQ filter) fields on `property`:** `category` (`cabin | beach | city | villa`), `nightlyPrice`, `maxGuests`, `petsAllowed` (boolean, since the filter is binary), `amenities` (array of strings from a fixed list, filtered with `"hot-tub" in amenities`), `location.city`, `location.state` (2-letter code) and `location.country`. Also typed but not filtered on yet: `cleaningFee`, `minNights`, `bedrooms`, `beds`, `bathrooms`, `checkInTime`, `checkOutTime` (`"15:00"` strings), `coordinates` (`geopoint`), `rating`, `reviewCount`.
- **Amenity list** (values, also the only places the labels `Hot Tub`, `Pet Friendly`... map from, in code): `hot-tub`, `pool`, `fireplace`, `ocean-view`, `forest-view`, `mountain-view`, `lake-view`, `skyline-view`, `wifi`, `workspace`, `kitchen`, `air-conditioning`, `ev-charger`, `bbq`, `fire-pit`, `beach-access`. Order matters: the details screen shows the first four as its highlights, so no separate highlights field.
- **Descriptive text (for embeddings), on the property document itself** (embeddings don't follow references): `summary` (one or two sentences, shown nowhere important, written in a guest's words: "A quiet A-frame hidden in the redwoods, ..."), `description` (long text) and `neighborhood` (long text). Soft intent (quiet, cozy, secluded, romantic) lives in this prose, **not** in a typed `tags` field. The local `tags` in `src/data/properties.ts` stay until the app switches to Sanity.
- **`host`:** `name`, `slug`, `photo` (image, hotspot, alt), `isSuperhost`, `bio`, `hostingSince` (year). Used on the details host row ("Hosted by Alex", Superhost).
- **`policy`:** `title`, `slug`, `kind` (`cancellation | house-rules | pets | check-in | payments | safety`), `summary` (the one line a card shows: "Full refund up to 7 days before check-in."), `body` (plain `text`, shown and quoted word for word), `refundWindowDays` (number, only for `cancellation`, hidden otherwise). Policy answers quote `body` exactly, so it is plain text, not Portable Text.
- **`property` references:** `host` (one `host`), `cancellationPolicy` (one `policy` with `kind == "cancellation"`, enforced with a reference filter), `policies` (array of `policy`, any other kind).
- **Seed mix:** 30 stays: 9 cabins, 7 beach, 7 city, 7 villas, $120 to $520 a night, a third pet friendly, 2 to 12 guests. It includes the 16 stays already in `src/data/properties.ts` (same titles, cities and prices, so the designs' stays exist) plus 14 new ones. 8 hosts (3 superhosts), 3 cancellation policies (Flexible 1 day, Moderate 7 days, Strict 30 days) and 5 shared policies (house rules, pets, check-in and check-out, payments and fees, safety). Prose is written per stay, not templated.
- **Photos:** curated Unsplash photo IDs per category, 5 per stay, with every URL checked (HTTP 200) before upload. A stay that can't get all 5 photos is skipped and reported, never half-seeded.
- **IDs and idempotency:** Sanity generates every `_id` (project rule). The seed finds existing documents by `slug.current` (`*[_type == $type && slug.current == $slug][0]._id`), creates the missing ones, and resolves references from the returned `_id`s. Default mode creates missing documents and skips existing ones, so it never overwrites an editor's changes; `--update` overwrites the seeded fields of existing documents. Array items get fixed `_key`s. Run twice: second run reports 0 created.
- **How the seed runs:** `cd studio && npx sanity exec scripts/seed.ts --with-user-token`. It uses the logged-in Sanity CLI user's token, so no secret is stored or added to `.env`. Data lives in `studio/seed/*.ts` (`hosts`, `policies`, `properties`, `photos`). No new dependency (`@sanity/client` ships with `sanity`).
- **Studio:** a `Roam` structure with Stays, Hosts and Policies lists, icons from `@sanity/icons` (per-path imports), `defineType` / `defineField` / `defineArrayMember` everywhere, `title` only when it adds something.
- **Schema deploy:** through the Sanity MCP (`deploy_schema`, then `deploy_studio`, since Sanity Context needs a deployed Studio for the dataset). The dataset is empty, so no existing content can break.

## Out of scope
- Swapping the app from `src/data/properties.ts` to Sanity, the details screen, and any API route or GROQ query code in the app.
- The Dataset Embeddings index, the Sanity Context (Knowledge Base) endpoint, Jev, and Agent Actions copy generation.
- Review documents, bookings, availability and calendar pricing, favorites.
- Drafts and publishing workflow: seeded documents are created already published.

## Steps
### 1. Schema types
In `studio/schemaTypes/` add `property.ts`, `host.ts`, `policy.ts`, a small `amenities.ts` (the fixed list, shared by the field and the seed) and update `index.ts`. Apply every field, option list, validation (required on title, slug, category, price, maxGuests, location, host, cancellationPolicy and at least 5 images; `min(1)` on price; `unique()` on amenities) and the `cancellationPolicy` reference filter from Decisions. Add `studio/structure.ts` and wire it into `sanity.config.ts`. Done when `cd studio && npx tsc --noEmit` and `npx sanity schema validate` pass and `npx sanity dev` shows the three lists with no schema errors.

### 2. Deploy the schema
Load the MCP schema rules, then deploy the types with the Sanity MCP (`deploy_schema` for project `a4so5rrr`, dataset `production`) and confirm with `get_schema` that all three types and their fields are there. Then deploy Studio with `deploy_studio` (`get_project_studios` to check the existing deployment). Done when `get_schema` returns `property`, `host` and `policy` with the expected fields.

### 3. Seed data
Write `studio/seed/` (hosts, policies, 30 properties, photo pools) and `studio/scripts/seed.ts`. Order: verify photo URLs, upsert policies, upsert hosts (uploading host photos), upsert properties (uploading and attaching 5 photos each, resolving references). Print a summary: created / skipped / updated per type, and any stay skipped with the reason. Realistic prose, plausible coordinates for each city, consistent numbers (maxGuests vs beds, price vs category, `rating` 4.3 to 5.0, `reviewCount` 8 to 400). Done when the script runs to the end on the first run with 30 + 8 + 8 created.

### 4. Check the data
Run the script a second time (0 created, nothing duplicated). Run the checks in Verification through the MCP `query_documents`. Done when every check passes.

## Verification
- `cd studio && npx tsc --noEmit`, `npx sanity schema validate` and the root `npx tsc --noEmit` + `npx expo lint` pass.
- MCP `get_schema` shows `property`, `host`, `policy`.
- First seed run: 30 properties, 8 hosts, 8 policies created. **Second run: 0 created**, counts unchanged (`count(*[_type == "property"]) == 30`).
- `documents_validate` (or Studio validation) reports no errors on any seeded document.
- Every property has a host and a cancellation policy that resolve (`count(*[_type == "property" && (!defined(host->_id) || cancellationPolicy->kind != "cancellation")]) == 0`) and exactly 5 images.
- Spot-check GROQ with params, the same filters the app parses: `"hot-tub" in amenities && petsAllowed == true && nightlyPrice <= $max && category == $category` returns Modern Cabin with Hot Tub ($289) among its results; `maxGuests >= $guests`; `location.state == $state`.
- A policy edited in Studio (or by patch) shows up through every stay that references it (checked with one `policies[]->` query), then reverted.
- Embedding readiness: every property has non-empty `summary`, `description` and `neighborhood` on the document itself.
- Not verifiable here: semantic-ranking quality (no embeddings index until a later plan), and how the Studio looks in the browser if I can't open it. Report either as unchecked.

## AGENTS.md updates
- **Who owns what, Content:** add the three document types, the typed-vs-prose split (filters are typed fields; soft intent lives in `summary` / `description` / `neighborhood`, no `tags`), hosts and policies as shared references, and "seed with `cd studio && npx sanity exec scripts/seed.ts --with-user-token`; idempotent by `slug`, Sanity-generated IDs".
- **Rules:** the placeholder-data rule stays until the app is wired to Sanity (a later plan).

## Result
Built as planned, with these changes:
- **Deploy:** the Sanity MCP's `deploy_schema` refuses to be used when a local Studio exists (it makes a second, MCP-managed schema without previews or validation functions), so the schema was deployed from `studio/` with `sanity schema deploy` and `sanity deploy` (hosted Studio `roam-rentals-a4so5rrr.sanity.studio`, appId in `studio/sanity.cli.ts`). The MCP was used to verify (`get_schema`, queries, `documents_validate`).
- **Seed:** 8 policies, 8 hosts, 30 stays. The 150 photo slots resolve to 54 distinct image assets, because each category draws from a pool of 10 to 14 verified photos and Sanity dedupes identical files, so some stays share photos.
- **Root `tsconfig.json`** now excludes `studio/` (it has its own tsconfig); before, `tsc` compiled the Studio's dependencies and failed inside `node_modules/eventsource`.
- Not run: the shared-policy edit propagation check, the embeddings index, and a visual check of Studio in a browser.
