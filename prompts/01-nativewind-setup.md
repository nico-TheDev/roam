# 01 · NativeWind v5 setup

Status: done

Written after the fact, as a record. The setup was built directly from the user's request, without a prior plan or approval step.

## Goal
Screens can be styled with Tailwind `className` utilities, including `dark:` variants that follow the system appearance.

## Decisions
- Source of truth is the NativeWind v5 docs: https://www.nativewind.dev/v5/llms-full.txt (only the first 100,000 of ~245,000 characters were read).
- v5 is a release candidate, built on Tailwind CSS v4 and `react-native-css`. Stable v4 (Tailwind 3) was not used.
- The docs' tested target is Expo SDK 57 / React Native 0.86. Roam is on SDK 58 / React Native 0.88, so this combination is unverified.
- The RC pair is pinned to exact versions: `nativewind@5.0.0-rc.0` and `react-native-css@3.1.0-rc.0`.
- Tailwind dev deps are pinned: `tailwindcss@4.1.12`, `@tailwindcss/postcss@4.1.12`, `lightningcss@1.30.1`, plus `postcss`. `lightningcss` is also pinned through npm `overrides`.
- Config is CSS-first: no `tailwind.config.js`, and no `nativewind/babel` preset.
- `postcss.config.mjs`, not `.cjs`, because Expo does not discover `.cjs`.
- `userInterfaceStyle` was already `automatic` in `app.json`, so dark mode needed no change there.
- `react-native-reanimated`, `react-native-worklets`, `react-native-safe-area-context`, and `expo-system-ui` were already installed.

## Out of scope
- Design tokens, theme colors, fonts, and a component library (they belong to a later design-system plan).
- Migrating screens beyond the test screen.
- A manual light/dark toggle (`Appearance.setColorScheme`).

## Steps
### 1. Install packages
Install the RC pair with `--save-exact`. Install the Tailwind and PostCSS dev deps with `--save-dev --save-exact`. Add `overrides.lightningcss` set to `1.30.1`. Done when `npx expo-doctor` passes.

### 2. Add config files
- `metro.config.js`: wrap `getDefaultConfig(__dirname)` in `withNativewind`.
- `postcss.config.mjs`: enable the `@tailwindcss/postcss` plugin.
- `src/global.css`: import `tailwindcss/theme.css` (layer theme), `tailwindcss/preflight.css` (layer base), `tailwindcss/utilities.css` (unlayered), then `nativewind/theme`.
- `nativewind-env.d.ts`: `/// <reference types="react-native-css/types" />`, and add it to `tsconfig.json` `include` (NativeWind did this itself on first type check).

### 3. Wire up and test screen
Import `../global.css` once in `src/app/_layout.tsx`. Style `src/app/index.tsx` with `className` (`flex-1 items-center justify-center bg-white dark:bg-black`, text `text-black dark:text-white`).

## Verification
- `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` pass.
- `npx expo export` builds for iOS and web.
- On the iOS simulator (`npx expo start --clear`, press `i`), toggle appearance with Cmd+Shift+A. Expected: white screen with black text in light mode, black screen with white text in dark mode.

## AGENTS.md updates
Add a styling line: NativeWind v5 RC (pinned exact versions, Tailwind v4, CSS-first config in `src/global.css`). Not added yet.

## Result
Installed and configured. Type check, lint, doctor, and iOS/web exports pass.

Not verified:
- Rendering and `dark:` switching in the simulator.
- Web CSS output: the web export emitted no CSS file, and an earlier iOS export showed a 0 B CSS file.

Side effects:
- `npx expo lint` auto-installed `eslint@^9` and `eslint-config-expo` and created `eslint.config.js`.
- npm warned that the `@tailwindcss/oxide` postinstall script is not covered by `allowScripts`.
