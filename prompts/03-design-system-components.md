# 03 · All design components and showcase page

Status: done

Builds on `02-design-system.md` (tokens, fonts, Lucide `Icon`, first 8 components).

## Goal
Every numbered section of `assets/prompt-imgs/design.png` exists as a shared component (or a token showcase), and a separate `/design-system` page shows all 15 numbered like the design.

## Decisions
- **Route:** `src/app/design-system.tsx` holds the showcase. The current preview in `src/app/index.tsx` moves there, and `index.tsx` becomes a plain placeholder screen with a link to it (real home screen comes with a later feature).
- **You asked for all 15, so the "extract at two screens" rule is waived** for the components below. AGENTS.md is updated to say so.
- **Numbering:** each showcase section has a header "NN. Title" exactly as in the design (01 Brand, 02 Color palette, 03 Typography, 04 Buttons, 05 Input fields, 06 Filter chips, 07 Listing card, 08 Policy card, 09 Profile row, 10 Bottom navigation, 11 Iconography, 12 Segmented control, 13 Toggles / Steppers, 14 Status / Alerts, 15 Tags / Badges). A small `Section` component renders the number and title.
- **Components, by section:**
  - 01 `Wordmark`: "roam" set in Bold with tagline "Find unforgettable stays for every kind of trip". The design's wordmark is an image, not provided, so this is a text stand-in (marked placeholder).
  - 02 and 03 and 11 are showcases only (swatches with name, hex and role; type ramp samples; icon grid). No component beyond the showcase.
  - 04 `Button` (exists), `IconButton` (exists).
  - 05 `TextField` (exists).
  - 06 `Chip` (exists, soft and accent variants).
  - 07 `ListingCard`: image (expo-image, remote placeholder), heart button, title, location, rating and review count, amenity badges, price per night. Takes plain props (title, location, rating, reviews, image, amenities, price) because its content is data from Sanity later.
  - 08 `PolicyCard`: lavender icon tile, title, snippet, chevron. Children-free, `icon`, `title`, `description`, `onPress`.
  - 09 `ProfileRow`: icon, label, chevron, press state, grouped list container `ProfileList` with hairlines.
  - 10 `TabBar`: floating glass capsule with 4 items (Home, Search, Trips, Profile), selected item is a yellow circle. Uses `expo-glass-effect` (installed) with a `glass` token fallback on Android and web. Standalone component taking `items`, `activeKey`, `onChange`. Wiring it into Expo Router tabs is left to the navigation feature.
  - 12 `SegmentedControl`: dark selected pill with icon and label (List, Map), generic over option keys.
  - 13 `Toggle` (native `Switch` with `primary` track color) and `Stepper` (minus, value, plus, min and max, accessible increment and decrement).
  - 14 `Alert` (exists).
  - 15 `Badge` (exists).
- Hex values estimated from the image and proposed new tokens are the same as in plan 02. New proposed tokens here: `ink-soft` is not added; selected segmented pill uses `ink` with `surface` text.
- Each component follows the plan 02 contract: variants, sizes where needed, pressed state, `className` merged last, accessibility roles and states.
- Icons use the existing `Icon` wrapper with Lucide.

## Out of scope
- Real home, search, listing and profile screens.
- Wiring `TabBar` into the Expo Router navigator.
- The roam wordmark image (listed as missing asset).
- Data fetching for listing and policy cards.

## Steps
### 1. Showcase scaffolding
Create `src/components/section.tsx` (numbered header) and `src/app/design-system.tsx`. Move the current preview content there, numbered per the design. Make `src/app/index.tsx` a placeholder with a link to `/design-system`. Done when `/design-system` renders the existing 04, 05, 06, 14, 15 sections numbered.

### 2. Cards and rows (07, 08, 09)
Add `listing-card.tsx`, `policy-card.tsx`, `profile-row.tsx` and export them. Add them to the page. Done when each state (pressed, favorite on and off) works.

### 3. Controls (12, 13)
Add `segmented-control.tsx`, `toggle.tsx`, `stepper.tsx`. Done when selection, min and max clamp, and screen reader labels work.

### 4. Navigation and brand (10, 01)
Add `tab-bar.tsx` (glass) and `wordmark.tsx`. Done when the tab bar shows the yellow selected circle and glass blur over content on iOS, with a solid fallback elsewhere.

### 5. Showcases (02, 03, 11)
Add the palette, type ramp and icon grid sections to the page, using tokens (no hex in the page; swatches use token classes and show hex as text from a single list in the page file, marked as documentation).

### 6. Compare with the design
Open `/design-system` in the iOS simulator (`xcrun simctl openurl booted roam:///design-system`), screenshot, compare with the design, list differences, fix, repeat. Report estimated values.

## Verification
- `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` pass; `npx expo export --platform ios` builds.
- All 15 sections appear on `/design-system`, numbered as in the design.
- Light and dark mode both render; pressed, disabled, selected states work.
- Grep for hex, `fontSize`, `fontWeight` outside `src/global.css` finds only commented one-offs.

## AGENTS.md updates
Design system section: list the full component set, the `/design-system` route as the reference for tokens and components, and replace "extract another only when it appears in two screens" with: new components go to `src/components/` and get a numbered-free entry on the showcase page.

## Result
Built Wordmark, ListingCard, PolicyCard, ProfileRow/ProfileList, TabBar, SegmentedControl, Toggle, Stepper and Section, and the numbered `/design-system` page (01 to 15). `index.tsx` is a placeholder linking to it. `tsc`, lint, `expo-doctor` and an iOS export pass.

Not verified: any rendering (no iOS simulator on this machine), including the glass tab bar, Lucide icon colors and the remote listing photo. Two component files hold hex values for native props that can't take classes (TextField placeholder, Toggle track), each commented.
