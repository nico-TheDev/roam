# Roam

Expo React Native rental app. Guests describe a stay in one sentence ("quiet pet friendly cabin with a hot tub under $300 a night") and get ranked stays back. They can also ask booking and policy questions about a stay, answered with exact text from Roam's own content.

This file is the project's memory: it holds every decision that is still true. Plans in `prompts/` are history.

## Commands

~~~bash
npx expo install <package>  # ALWAYS use instead of npm install: resolves SDK-compatible versions
npx expo start              # dev server (press i for the iOS simulator)
npx expo lint               # lint
npx tsc --noEmit            # type check
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npx eas-cli@latest <cmd>    # EAS builds, submits, and updates (use instead of bare `eas`)
~~~

## Expo

- Expo ships breaking changes every SDK release, so don't trust memory. Before touching an Expo, EAS, or React Native API, check the `expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`. For anything else, start from https://docs.expo.dev/llms.txt and follow its links.
- Routes live in `src/app/`: every file is a screen and `_layout.tsx` files define navigators. API routes are `src/app/api/*+api.ts`. Keep components, hooks, and utils outside `src/app/`.
- `ios/` and `android/` are generated. Never create or edit them by hand; configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, switch to a development build (`npx expo run:ios`).

## Who owns what

Each tool has one job. Ask before moving a responsibility to a different tool.

- **Auth:** Clerk is the source of truth. The app keeps its own custom auth screens, built on `useSignUp` / `useSignIn` / `useSSO` from `@clerk/expo` (method-based API, never the legacy `setActive` flow except for SSO). Instance settings change through the Clerk MCP (`patch_instance_config`, dry run first). Dev instance: email + password, email-code verification, device trust on (new devices get a code on sign in), first/last name on, password min 8, Google on, Apple off.
- **Content:** Sanity project `a4so5rrr`, dataset `production`. Three document types: `property`, `host`, `policy`. Hosts and policies are shared documents that stays reference (one host, one cancellation policy, a list of other policies). Everything guests filter on is a typed field on `property` (`category`, `nightlyPrice`, `maxGuests`, `petsAllowed`, `amenities` from a fixed list, `location.city|state`). Soft intent lives only in prose on the property (`summary`, `description`, `neighborhood`), never in a `tags` field. Policy `body` is plain text, quoted word for word. Studio is a standalone app in `studio/` (hosted at `roam-rentals-a4so5rrr.sanity.studio`), and its source is the only schema: deploy it with `cd studio && npx sanity schema deploy` and `npx sanity deploy`, never the MCP `deploy_schema` (that creates a competing MCP-managed schema). Content changes and checks go through the Sanity MCP, and generated property copy uses Agent Actions.
- **Seed data:** `cd studio && npx sanity exec scripts/seed.ts --with-user-token` (data in `studio/seed/`). Idempotent by `slug.current` with Sanity-generated IDs: it creates what is missing and skips what exists; add `-- --update` to overwrite seeded fields. It uses the CLI login, so it needs no token. The seed fills `vibeNotes` on existing stays when missing.
- **Generated copy:** `summary`, `description` and `neighborhood` are written by Agent Actions (Generate, `noWrite`) from a stay's typed fields plus `vibeNotes` only (`copyFactsHash` records the facts used), and written to Sanity only when `studio/seed/check-copy.ts` finds no invented number, place, amenity, feature, pet claim, unsupported soft word or sales language. Run `cd studio && npx sanity exec scripts/generate-copy.ts --with-user-token -- [--baseline|--dry|--force|--only <slug>]`; unchanged facts are skipped. To change what copy may say, edit `vibeNotes` in Studio, then rerun. Self-test: `npx sanity exec scripts/check-copy-selftest.ts`.
- **Exact constraints** (price, guests, type, amenities, pets, place): GROQ filters, with values always passed as params.
- **Soft intent** (quiet, cozy, secluded): Dataset Embeddings, enabled on `production` with a property-only projection (`title`, place, `category`, `summary`, `description`, `neighborhood`, `vibeNotes`; no references), used as `score(text::semanticSimilarity($q))` after the hard filters, from `src/app/api/search+api.ts` with only the soft words and leftovers as `$q`. Status: `cd studio && npx sanity datasets embeddings status production`. Queries count against the monthly semantic quota.
- **Policy knowledge:** a Sanity Context endpoint in Knowledge Base mode. Context endpoints are created in the Dashboard's Context app and read with an organization token (Context Viewer), per https://www.sanity.io/docs/ai/context-migration-guide. One endpoint serves one mode. The Context skill still describes `sanity.agentContext` Studio documents with a project token; that route is deprecated, so don't use it.
- **Typed decisions** (which stay topics and policies answer a question): Jev, called from API routes through the AI SDK's `experimental_evaluate` with the `@ai-sdk/typesafe-ai` provider and `TYPESAFE_AI_API_KEY`. No Vercel AI Gateway. Keep `ai` and `@ai-sdk/typesafe-ai` pinned to exact versions, since the API is experimental.
- **Answer text:** none generated. Answers show the stay's own fields and policy text word for word, with their source. No LLM runs in the app.
- **Analytics:** PostHog, identified through Clerk. Search sends `stay_search_completed` (`outcome: results | no_results`, counts, filter types, sort, source; never the query text) and `stay_search_failed` (`reason`). Details send `stay_opened` (`stay_id`, `category`, `price_per_night`, `rating`, `source: home | search | link`) once per visit and `stay_book_tapped` (`stay_id`).

## Rules

- Secret keys (Clerk secret key, TypeSafe key, Sanity organization token, Sanity write token, `SANITY_API_READ_TOKEN`) never reach the app bundle. Use them only in API routes and local scripts such as seeding. Never put them behind `EXPO_PUBLIC_`, which is bundled into the app. Never commit `.env`. Keep variable names, without values, in `.env.example`.
- Sanity Context needs a deployed Studio for the dataset. Redeploy Studio from `studio/` after schema changes.
- Jev is not an agent. It answers typed questions (Choice, Noul, Score) with probabilities. It never writes GROQ, calls tools, or generates text. Code builds queries from its answers.
- Prices, guest counts, and dates are parsed in code. Jev may choose between candidates code found, but never produces the value.
- Stay details (`src/app/stay/[id]/index.tsx`, policies form sheet `stay/[id]/policies.tsx`, ask chat `stay/[id]/ask.tsx`) read one stay from the public CDN through `src/lib/stay-details.ts` (`useStayDetails`, `$id` param, cached for the sheet). House rules and the cancellation policy show Sanity text word for word. "Ask about policies" opens a chat with topic chips and one `AnswerCard` per topic (text plus source label); its replies are sample text in `src/lib/ask-samples.ts` until the Context-backed backend replaces it. "Book this stay" only shows "Booking is coming soon." The total is an estimate: nightly price × `minNights` + cleaning fee. The heart is local state; share uses the native sheet.
- Home reads live stays from the public Sanity CDN through `src/lib/stays.ts` (`useFeaturedStays`, one request for every category; `EXPO_PUBLIC_SANITY_PROJECT_ID` / `EXPO_PUBLIC_SANITY_DATASET` are public values). Search reads Sanity through `src/app/api/search+api.ts` (Clerk-verified with `@clerk/backend`, query built in `src/lib/search-query.ts`, hard filters as GROQ params). Code parses the sentence (`parseQuery` in `src/lib/search.ts`, which also lists the known cities, states and amenities); screens use `useSearchStays` (`src/lib/search-stays.ts`) and `parseQuery` for chips. Jev is not in Search yet. Semantic ranking never returns zero, so no-results only comes from hard filters.
- Embeddings rank, they don't filter, and they only see the document itself (no references). Hard constraints are always GROQ filters, and text that should affect ranking lives on the property document.
- Policy answers show only text from the stay's data and Roam's policies, word for word. If nothing answers the question, say so and point to support.
- API routes verify the Clerk session before doing any work.
- PostHog failures never block the app. Never send what guests type, tokens, or personal data in events.
- Let Sanity generate document IDs. Model relationships as references.
- Ask before adding a dependency or service, changing the Sanity schema once content exists, or deleting data. Prefer Expo modules over third-party libraries.
- Whenever you need input from the user, ask through your tool's built-in question panel so they pick from options instead of typing. Give two to four clear options with the recommended one first. Fall back to plain text only if no such panel exists.

## How we build features

For a new feature or a change across several files. Small fixes and questions skip this.

1. **Understand.** Read the code involved. Open an earlier plan only if this feature builds directly on it (pick by file name). Read the current docs pages for the APIs you'll use, and load a matching skill if one exists (e.g. the Expo, Clerk, Sanity, Sanity Context, or TypeSafe skills). Don't write version-specific APIs from memory.
2. **Ask.** If a real decision is unclear (scope, visible behavior, data shape), ask in the question panel, batching questions into one round and following up only if the answers raise new ones. Pick defaults for the rest and list them. If a decision in this file looks wrong, raise it instead of changing it.
3. **Plan.** Copy `prompts/TEMPLATE.md` to `prompts/NN-feature-name.md` (next number) and fill it in. The plan must be self-contained, so a fresh session can build it from this file plus the plan alone.
4. **IMPORTANT: stop and wait.** Write no app code until the user approves the plan. Ask for approval in the question panel (approve, or request changes). If they request changes, update the plan and ask again. On approval, set `Status: approved`.
5. **Build** step by step, checking each one. If a step turns out wrong, stop and explain instead of redesigning.
6. **Close out.**
   - Run the plan's Verification and give the report described under Reporting.
   - Add a short `## Result` to the plan and set `Status: done`.
   - Update this file: put each lasting decision in the section it belongs to. Replace or remove rules that are no longer true instead of appending. Keep this file under 150 lines.

## Design system

- NativeWind v5 RC (pinned exact versions, Tailwind v4, CSS-first). Tokens live in `src/global.css` (`@theme` colors, fonts, radii, `text-*` ramp utilities, `shadow-card`); dark values override them under `prefers-color-scheme`.
- Screens use token classes and `src/components/` only. No hex, font size, font weight or ad-hoc spacing in screens. Screen edge padding is `px-5`.
- Font is Plus Jakarta Sans. It is loaded at runtime with `useFonts` in `src/app/_layout.tsx` (the `app.json` plugin alone does nothing in Expo Go). Weight comes from family names: the `text-*` utilities, or `font-jakarta-medium|semibold|bold` to override. Never `fontWeight`, and never name a font token `--font-bold` (it collides with Tailwind's weight utility).
- `metro.config.js` gives `expo-asset` and `expo-font` the real `react-native` module, because NativeWind's wrapper lacks `AssetRegistry` and font loading fails otherwise. Don't remove it.
- Visual checks: run `npx expo start --port <free port>` without `CI=1` (CI mode disables reloads), set `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` for `xcrun simctl`, and open `exp://<lan-ip>:<port>` in Expo Go. `/design-system?only=04,05` renders chosen sections.
- Extra tokens: `scrim`/`on-scrim` (dark pill over photos, white text in both themes), `text-headline` (Bold 42/44, `Text variant="headline"`), `text-headline-sm` (Bold 36/40, auth titles), `text-lead` (Regular 18/26, `Text variant="lead"`), `font-brand` (Outfit ExtraBold, logo only, loaded in `_layout.tsx`). `SheetShape` draws the onboarding sheet's lopsided top edge with an SVG filled by `text-surface`. `Button` `trailing` is pinned to the right edge.
- Routes: `index.tsx` is onboarding (3 slides), `sign-up.tsx`, `verify.tsx` (`flow` param: `sign-up` | `sign-in`) and `sign-in.tsx` are the auth screens, the signed-in app is the `(tabs)` group (`home`, `search`, `trips`, `profile`, URLs `/home`, `/search`...) using `NativeTabs` from `expo-router/native-tabs` (the `unstable-` path is deprecated in SDK 58); Trips and Profile are placeholders, Profile holds Sign out. `src/app/_layout.tsx` waits for Clerk's `isLoaded` (splash stays up), then uses `Stack.Protected`: `(tabs)` only when signed in, the rest only when signed out. Screens never navigate after success, the guards do.
- Auth code lives in `src/lib/auth.ts` (hooks returning `AuthResult`; Clerk errors mapped there). The session is persisted by `tokenCache` (`expo-secure-store`). Form rules live in `src/lib/validation.ts` and must match the Clerk instance rules. Sign-up splits "Full name" on the first space into first/last name.
- `Text` drops its variant's default color when the caller passes a `text-<color>` class, because generated CSS orders color utilities alphabetically (`text-danger` would lose to `text-ink`). Root `Stack` hides headers; `design-system` re-enables its own.
- Shared components live in `src/components/` (exports in `index.ts`): Text, Button, IconButton, Chip, Badge, TextField, Alert, Surface, Icon, Section, Wordmark (`size` md|sm|xs), OnboardingDashes, AuthScreen, AuthSwitch, CodeInput, Divider, SocialButtons (`providers` prop, screens pass `["google"]`), ListingCard (`favoritePlacement` image|inline), FeaturedCard, SearchPill/SearchField (`trailing` slot for the filter icon), Avatar, PressableScale, PolicyCard, ProfileRow/ProfileList, TabBar, SegmentedControl, Toggle, Stepper, StayGallery, AmenityHighlight, RatingBox, HostRow, BookingBar, AnswerCard, ChatBubble, ChatInput. The numbered `/design-system` route (`src/app/design-system.tsx`) shows all 20 design sections: add every new shared component there.
- Wordmark is a text placeholder until the logo asset is provided. TabBar is presentational; Expo Router tabs will wrap it.
- Motion follows the `expo-animation` skill: every tappable uses `PressableScale` (scale 0.97, 120 ms, background color 150 ms); no animation on tab switches; entrances come from `useEntering` in `src/lib/motion.ts` (250 ms, staggered, capped, fade only with Reduce Motion). Props that need a color value (placeholder, tab tint) read tokens with `useTokenColor` (`src/lib/use-token-color.ts`), never hex.
- Icons: `lucide-react-native` (with `react-native-svg`, a native module, so Expo Go works but a dev build is needed for custom builds). Use the `Icon` component in `src/components/icon.tsx`, colored with token classes (`text-muted`), never raw `color` props.

## Building from designs

Designs are attached in the chat. Screens must match them exactly: layout, spacing, sizes, colors, type, radii, icons, and copy.

- Icons, fonts, and brand images come from `assets/` or the chosen icon library, never recreated from a screenshot. Sample property photos may be remote placeholder images. If an asset is missing, use a marked placeholder and list it.
- Map every color, font, spacing value, and radius to a design-system token. List values with no token in the plan as proposed new tokens instead of hardcoding them. When creating the design system itself, derive the tokens from the designs.
- UI plans describe the design (elements, states, tokens, assets) well enough to build without the image. If building in a new session, ask for the design to be attached again.
- After building, open the screen in the iOS simulator (deep link with `xcrun simctl openurl booted <url>` when it isn't the first screen; the scheme is in `app.json`), take a screenshot (`xcrun simctl io booted screenshot <path>`), and compare it with the design. List every difference, fix, and repeat. Report which values were estimated from an image.

## Reporting

End every piece of work that changes code (features and fixes, not answers to questions) with this report. Use these headings in this order, and leave out any section that would be empty.

- **Done:** one line on the outcome, then the files changed and what changed in each.
- **Verified:** each check with ✅ or ❌ and its evidence (command output, screenshot). List what wasn't checked as ❌ with the reason. Never mark something ✅ without running it.
- **You need to:** numbered actions only the user can take, such as keys, dashboard settings, manual steps in Sanity, or assets to provide.
- **Test it yourself:** numbered steps to reproduce the result from a fresh start, ending with `Expected:` and what the user should see.
- **Notes:** defaults picked, trade-offs, and anything left for later.

## Checks

- Lint and type check pass before any task is called done.
- Screens that load data handle loading, error, and empty states.
- AI features are tried against realistic inputs, and failures are explained by cause: missing data, the decision Jev made, the query, or the code.