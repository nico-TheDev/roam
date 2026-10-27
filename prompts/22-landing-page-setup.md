# 22 · Landing page setup (Astro)

Status: done

## Goal
A standalone Astro site in `landing/` that builds to static HTML, runs with `npm run dev`, and uses Roam's design tokens. Barebones only: one placeholder home page, no real copy or sections yet.

## Decisions
- Astro, static output, in `landing/` beside `studio/`. Own `package.json` and lockfile; installed with `npm install` inside `landing/`, never `npx expo install` (the Expo dependency tree stays untouched).
- Tailwind v4 through `@tailwindcss/vite` (what `npx astro add tailwind` installs). Same CSS-first approach as the app.
- Tokens: copy the `@theme` color, radius and font tokens from `src/global.css` into `landing/src/styles/global.css`. Copy, never import across the boundary. Light and dark values copied the same way.
- Fonts: Plus Jakarta Sans (and Outfit for the wordmark) loaded from Google Fonts in the base layout. Wordmark stays text until the logo asset exists.
- One layout (`src/layouts/Base.astro`: head, title, description, font links, header and footer slots) and one page (`src/pages/index.astro`). Privacy and support pages come in a later plan.
- Hosting is not chosen yet; the build output (`landing/dist/`) is a plain static folder, so any host works.
- Root checks ignore it: add `landing` to `exclude` in `tsconfig.json` and `landing/**` to the ESLint `ignores`.
- Node: Astro needs an even-numbered Node (the installed v26.8.2 qualifies). Latest Astro major is resolved at install time; the plan pins whatever `npm create astro` installs, exact versions.

## Out of scope
Real content, sections, copy, screenshots, App Store badges, waitlist form, analytics, privacy and support pages, domain and deploy.

## Steps
### 1. Scaffold
From the repo root run `npm create astro@latest landing -- --template minimal --no-git --no-install` (check flags with `--help` first), then `cd landing && npm install`. Pin Astro exact in `landing/package.json`. Add `landing/node_modules`, `landing/dist` and `landing/.astro` to the root `.gitignore`. Done when `npm run dev` in `landing/` serves the template page.

### 2. Tailwind and tokens
Inside `landing/` run `npx astro add tailwind` (confirm it creates the Vite plugin entry in `astro.config.mjs` and `src/styles/global.css`). Copy the `@theme` tokens from `src/global.css` and the dark overrides into `landing/src/styles/global.css`, skipping app-only tokens (native `text-*` ramp, `shadow-card` stays if plain CSS). Done when a test element using `bg-surface text-ink rounded-*` renders with the right colors in light and dark.

### 3. Layout and placeholder page
Create `src/layouts/Base.astro` and rewrite `src/pages/index.astro` to a single placeholder (wordmark text, one-line tagline, "Coming soon"). Fonts via Google Fonts links. Add `<title>` and meta description props. Done when the page looks on-brand and is responsive at phone width.

### 4. Keep root checks clean
Add `landing` to `exclude` in `tsconfig.json` and `landing/**` to `ignores` in `eslint.config.js`. Add a short `landing/README.md` with the dev and build commands.

## Verification
- `cd landing && npm run build` succeeds and `dist/index.html` exists.
- `npm run preview` shows the page in light and dark mode at desktop and phone width (screenshot).
- From the repo root: `npx tsc --noEmit` and `npx expo lint` pass and report nothing from `landing/`.
- `git status` shows no `node_modules`, `dist` or `.astro` from `landing/`.
- App still starts: `npx expo start` is unaffected (no root `package.json` change).

## AGENTS.md updates
Add under Commands: `cd landing && npm run dev | build` for the marketing site. Add to "Who owns what": **Landing page:** Astro static site in `landing/`, own dependencies, tokens copied from `src/global.css`, not part of the Expo app or root type check.

## Result
Astro 7.4.2 + Tailwind 4.3.3 (exact) in `landing/`; `npm run build` emits `dist/index.html`. Tokens copied; one placeholder page. Root tsc/lint report nothing from `landing/`.
