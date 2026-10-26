# 04 · Onboarding screen and auth entry

Status: done

Builds on `03-design-system-components.md` (tokens, `Button`, `Text`, `Icon`, `Wordmark`). Design: `assets/prompt-imgs/onboarding.png` (ask for it again if building in a new session). The auth destination is `assets/prompt-imgs/auth.png`, but that screen is a later feature.

## Goal
On launch the guest sees three swipeable onboarding slides that match the design. "Get started" and "Continue with Google" lead into the auth flow, and "Skip" leaves onboarding.

## Decisions
Answers from the question round:
- **3 swipeable slides.** Photo, headline, body copy and location tag change per slide. Slides 2 and 3 copy is written by me (below), for you to edit.
- **Auth link:** "Get started" opens a placeholder `/sign-up`, "Continue with Google" also opens `/sign-up` for now, "Skip" goes to `/(home)` placeholder (the current `index.tsx` content). Real Clerk wiring belongs to the auth feature.
- **Always shown** as the entry route. No "seen" flag, no new storage dependency.

Defaults I picked:
- **Routes:** `src/app/index.tsx` becomes the onboarding screen. The current placeholder (link to `/design-system`) moves to `src/app/home.tsx`. New `src/app/sign-up.tsx` and `src/app/sign-in.tsx` are placeholders (title, back button, one link to each other) so navigation works end to end. Root `Stack` gets `headerShown: false`.
- **Slides:** horizontal paging `FlatList` (`pagingEnabled`), full screen width per slide. Dashes track the scroll position. The bottom sheet text and the photo swipe together as one slide. No new dependency.
- **Images:** `expo-image` (installed) with remote Unsplash URLs, `contentFit="cover"`, a short transition. URLs are checked to return 200 before building. Sample photos, not final assets.
- **Layout:** photo fills the screen behind the status bar. Wordmark top-left and Skip pill top-right sit in the safe area. Location pill is bottom-left above the sheet. The sheet is anchored to the bottom, covering about 41% of the screen height, with `pb` from the safe-area inset.
- **Sheet shape:** the design's top edge is a soft curve (higher on the left, curving down to a large right radius). I use `rounded-t-lg` (24px) on both corners as the nearest token. Listed as a difference.
- **Skip** stays visible on every slide.
- **Get started** always goes to `/sign-up`. It does not advance slides. Dashes only move by swiping or by tapping a dash.
- **Accessibility:** slides are a `FlatList` with an accessibility label per slide, dashes have `accessibilityRole="tab"` and selected state, Skip and buttons keep their `Button` roles.
- **Dark mode:** the sheet uses `bg-surface` and text tokens, so it follows the theme. The photo and overlaid pills do not change.

Slide content:
1. Whistler, BC. "Find a stay that fits your story". "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip." Unsplash: mountain cabin at sunset by a lake.
2. Joshua Tree, CA. "Just say what you're after". "Describe your trip in one sentence, like a quiet pet friendly cabin with a hot tub, and see ranked stays." Unsplash: desert house.
3. Big Sur, CA. "Know before you book". "Check house rules, cancellation and pet policies in the host's own words, with the source shown." Unsplash: coastal home.

## Design to token mapping
Estimated from the image (1122 px wide frame, about 2.9x scale):
- Screen background behind the photo: `bg-ink`. Sheet: `bg-surface`. Dashes active `bg-secondary`, inactive `bg-surface-alt`, about 36 × 4, gap 8.
- Skip pill: `bg-glass`, `rounded-full`, `text-caption`, height about 48, `px-5`.
- Location pill: dark translucent with white text and a white `MapPin` icon. No token for dark glass. **Proposed new token:** `--color-scrim: rgba(11, 11, 26, 0.55)`, used with a `border border-surface/40`. Text white: **proposed new token** `--color-on-scrim: #ffffff` (does not flip in dark mode).
- Headline: bold, about 34 px over 2 lines. No matching ramp utility (`text-heading` is 28). **Proposed new utility:** `text-headline` (Bold 34/38).
- Body: `Text variant="body"` (muted, 16/24). The design looks slightly larger (about 17); I keep 16 and list the difference.
- Primary button: `Button` primary with `ArrowRight` in `trailing`. Design has the label centered with the arrow at the right edge; the existing `Button` centers label and arrow together. Difference to check, and fix with a small `Button` tweak only if it is visibly off.
- Google button: `Button variant="secondary"` with a Google logo `icon`. **Missing asset:** the multicolor Google "G" is not in `assets/` or Lucide. I use a marked placeholder (a neutral circle with "G") until you provide `assets/images/google.png` (or SVG).
- Wordmark: existing text placeholder, size smaller (about 56 px) with no tagline. Add a `size` prop to `Wordmark` rather than overriding in the screen. **Missing asset:** roam wordmark image.
- Edge padding `px-5`. Radii: pills `rounded-full`, sheet `rounded-t-lg`.

## Out of scope
- Real Clerk sign-up, sign-in, Google OAuth and session gating.
- The Create account screen UI from `auth.png`.
- Persisting that onboarding was seen.
- Real property photos from Sanity.

## Steps
### 1. Tokens and small component changes
In `src/global.css` add `--color-scrim`, `--color-on-scrim` and the `text-headline` utility. Add a `size` prop (`md` default, `sm` ≈ 56 px) to `src/components/wordmark.tsx`. Show the new Wordmark size on the `/design-system` 01 section. Done when lint and type check pass and `/design-system?only=01` shows both sizes.

### 2. Route restructure and placeholders
Move the current `src/app/index.tsx` content to `src/app/home.tsx`. Add `sign-up.tsx` and `sign-in.tsx` placeholders (heading, `IconButton` back with `ChevronLeft`, link to the other). Set `headerShown: false` in `src/app/_layout.tsx`. Done when `/home`, `/sign-up`, `/sign-in` open in the simulator via deep link and back works.

### 3. Onboarding screen
Create `src/components/onboarding-slide.tsx` (photo, location pill) and `src/components/onboarding-dashes.tsx` (progress dashes), then build `src/app/index.tsx`: paging `FlatList` of slides, fixed Wordmark and Skip overlay, bottom sheet with dashes, headline, body, Get started and Continue with Google. Slide data (image URL, location, headline, body) lives in a typed array at the top of `index.tsx`. Handle image load failure by showing `bg-ink` behind the content. Done when swiping changes photo, text, location and active dash, and each control navigates as in Decisions.

### 4. Visual comparison
Per AGENTS.md: open in the simulator, screenshot, compare with `onboarding.png`, list every difference, fix, repeat. Check small (iPhone SE) and large screens and dark mode.

## Verification
- `npx expo lint` and `npx tsc --noEmit` pass.
- Unsplash URLs return 200 (curl).
- Simulator: first launch shows slide 1; swipe to slides 2 and 3 and back, dashes follow; tapping a dash jumps to its slide.
- Get started → `/sign-up`; Continue with Google → `/sign-up`; Skip → `/home`; back from `/sign-up` returns to onboarding.
- Screenshot vs design: list differences (sheet curve, body size, Google logo, wordmark).
- Dark mode: sheet and text readable.
- End to end: cold start → swipe through → Get started → placeholder sign-up → back.

## AGENTS.md updates
- Design system: add the new tokens (`scrim`, `on-scrim`, `text-headline`) and the `Wordmark` size prop.
- Add a short "Routes" note: `index.tsx` is onboarding, `home.tsx` is the home placeholder, `sign-up` and `sign-in` are placeholders until the Clerk feature.

## Result
Built as planned, with these changes: slide text, location pill and dashes are fixed overlays that change with the active slide (only the photos swipe); photos and locations are Whistler (lit lakeside cabin), Hella, Iceland (red house) and Maldives (thatched villa) instead of the locations first listed; `Button` `trailing` is now pinned right (matches the design); `Text` gained `headline`; headline has `pr-20` so it wraps as in the design. Not verified: swiping, dash taps, Skip and Google navigation (no tap or swipe tool for Expo Go), dark mode, small screens. Wordmark and Google "G" are placeholders.

### Follow-up
Sheet now uses the design's asymmetric edge (`SheetShape`, SVG path from the 402pt design width). Body is `text-lead` 18/26 and headline 42/44, sized from measurements of the design. Logo uses Outfit ExtraBold (OFL, `assets/fonts/Outfit-ExtraBold.ttf`) as the closest free match. Slide change fades the text up and fades the location pill in (Reanimated `entering`).
