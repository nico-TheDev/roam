# 02 · Design system

Status: done

## Goal
Every screen draws from one source of truth: color, font, radius, spacing and text tokens in `src/global.css`, plus a small set of shared components in `src/components/`. Built from `assets/prompt-imgs/design.png`.

## Decisions
- **Extend NativeWind, don't add a second system.** Tokens live in `src/global.css` under `@theme` (Tailwind v4, CSS-first), as the expo-design-system skill prescribes for Tailwind projects. No `src/theme/` folder, no `tailwind.config.js`.
- **Font is Plus Jakarta Sans** (Regular, Medium, SemiBold, Bold, already in `assets/fonts/`). The design labels it "Geometric Sans"; Plus Jakarta is the supplied stand-in. Loaded with the `expo-font` config plugin in `app.json` (already installed), so there is no loading flash. Weight comes from `fontFamily` names, never `fontWeight`.
- **Colors** (hex values estimated from the image, since the design prints them):
  - `primary` #FFC629 (the image says #FFC629, "Primary Yellow"), `secondary` #C9B4FF (Lavender), `ink` #0B0B1A (Text Primary), `muted` #6B7280 (Text Secondary), `surface` #FFFFFF, `surface-alt` #F4F5F7 (Surface Gray), `border` #E5E7EB, `glass` rgba(255,255,255,0.7).
  - Proposed new tokens, estimated from the image: `secondary-soft` (lavender tint, focused input and policy card icon tile), `success` / `success-soft`, `danger` / `danger-soft`, `info-soft` (Superhero badge), `highlight-soft` (Guest favorite badge).
- **Dark mode:** the design shows light only. Proposed dark values are set for each color so `dark:` works (screens inherit them through the tokens, no `dark:` classes at call sites). Treat them as a starting point to review. Primary and lavender keep their hue in both modes.
- **Radii:** `sm` 12 (badges, small tiles), `md` 16 (inputs, alerts), `lg` 24 (cards, sheets), `full` capsule (buttons, chips, icon buttons). Estimated from the image. Continuous corners (`borderCurve: continuous`) on every non-capsule radius.
- **Spacing:** Tailwind's default 4-point scale is kept. Screen edge padding is 20 (`px-5`) as in the design. No custom spacing tokens.
- **Type ramp** as `@utility` classes so screens never set size or line-height: `text-display` (56/56 bold), `text-heading` (28/34 bold), `text-title` (20/26 semibold), `text-body` (16/24 regular), `text-caption` (14/20 medium), `text-button` (17/22 medium).
- **Shadow:** one soft card shadow token (`shadow-card`), since the design uses only subtle elevation.
- **Shared components** (variant/size/state per the skill's component contract, `style` merged last, `Pressable` pressed state, accessibility roles): `Text`, `Button` (primary, secondary), `IconButton`, `Chip` (default, selected, with icon), `Badge` (tones: highlight, success, danger, info), `TextField` (default, focused, error, password toggle), `Alert` (success, danger), `Surface`.
- **Not extracted yet** (appear once in the design, so they stay in their screens until a second screen needs them): listing card, policy card, profile row, bottom tab bar, segmented control, stepper. The toggle is the native `Switch`, themed with `primary`, not wrapped.
- **Icons:** components take an icon as `children` or a prop, with no icon library chosen. Picking one (the design uses line icons) needs your approval and is a later step.
- **Glass:** `glass` is a token only. The tab bar that uses it comes with the navigation feature, using `expo-glass-effect` (already installed).
- The design system plan is the only thing that changes `src/global.css`'s token layer. The default blue/green test classes on `src/app/index.tsx` are replaced by a design-system preview screen.

## Out of scope
- Screens from the other designs (home, search, auth, profile, details, onboarding).
- Tab bar, listing card, policy card, profile row, segmented control, stepper.
- Choosing an icon library.
- A manual light/dark toggle.
- Wordmark/logo asset (`roam` in the design is a brand image, not provided in `assets/`; listed as a missing asset).

## Steps
### 1. Fonts
Register the four Plus Jakarta Sans files with the `expo-font` config plugin in `app.json`. Done when `npx expo-doctor` passes and the font names are available to `font-*` classes.

### 2. Tokens in `src/global.css`
Add an `@theme` block: colors (with dark values through `@media (prefers-color-scheme: dark)` or `dark:` variables per the NativeWind v5 docs), `--font-*`, `--radius-*`, `--shadow-card`. Add the `@utility text-*` ramp. Read the NativeWind v5 docs for the exact variable and dark mode syntax before writing, and keep to what works on native, not just web. Done when a test element using each token renders in the simulator.

### 3. Components
Create `src/components/` files: `text.tsx`, `button.tsx`, `icon-button.tsx`, `chip.tsx`, `badge.tsx`, `text-field.tsx`, `alert.tsx`, `surface.tsx`. Each has typed variant, size and state props, merges `style`/`className` last, and exposes accessibility roles and states. Components use token classes only: no hex values, font sizes or ad-hoc spacing.

### 4. Preview screen
Replace `src/app/index.tsx` with a scrollable preview of every token and component state (design sections 01 to 06, 14, 15 and the input fields), in light and dark. It is a development aid and is removed or moved once real screens exist.

### 5. Compare with the design
Open it in the iOS simulator, take a screenshot, compare it with `design.png`, list every difference, fix, repeat. Report values estimated from the image.

## Verification
- `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` pass.
- iOS simulator: preview screen matches the design for brand, palette, typography, buttons, input fields, chips, badges and alerts. Toggle appearance (Cmd+Shift+A): colors adapt, text stays readable.
- Fonts render as Plus Jakarta Sans at all four weights, not the system font.
- Pressed, disabled, focused and error states can each be seen.
- `grep` for hex colors, `fontSize` and `fontWeight` outside `src/global.css` finds nothing.

## AGENTS.md updates
Add a **Design system** section: tokens live in `src/global.css`; screens use token classes and `src/components/` only; no hex, font size or ad-hoc spacing in screens; font is Plus Jakarta Sans via `fontFamily`; extract a component only when it appears in two screens.

## Result
Tokens, fonts, 8 components and a preview screen (`src/app/index.tsx`) are built. `tsc`, lint, `expo-doctor` and an iOS export pass.

Not verified: rendering. No iOS simulator is available here (`xcrun simctl` missing), so the screenshot comparison, dark-mode switching, font rendering and the `@media (prefers-color-scheme: dark)` token override on native are unchecked. Preview icons are text glyphs standing in for the missing icon library.

Follow-up: icons use `lucide-react-native` + `react-native-svg` through an `Icon` wrapper (`src/components/icon.tsx`, NativeWind `styled`, color from `text-*` classes). The preview now uses real icons. Rendering is still unverified (no simulator).
