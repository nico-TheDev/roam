# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing: Astro static site in `landing/` (Tailwind v4, tokens copied from the app's `src/global.css`). The Expo app is a separate native product (`src/`); this record covers the marketing site.

## Users

Guests planning a stay who know the feel they want better than the filters ("quiet pet friendly cabin with a hot tub under $300 a night"), on a phone or laptop, comparing apps before installing one. A second audience: people with a place to rent who can become hosts from inside the same app.

## Product Purpose

Roam is a rental app. A guest describes a stay in one sentence and gets ranked stays back. They can ask booking and policy questions about a stay and get exact text from Roam's own policies. The landing page's job: make that one-sentence search intelligible, get a visitor to download the app once it is on the stores.

## Positioning

Search by sentence where exact constraints (price, guests, pets, place, amenities) are applied as hard filters and only the feel (quiet, cozy, secluded) ranks what is left. Policy answers are Roam's own words, shown word for word, never written by a model.

## Operating Context

Guests search, save stays, book and pay (Stripe, test mode today), see trips. Anyone signed in can become a host, add stays with photos and edit nightly price and cleaning fee. Sample content is seeded (cabins, beach houses, villas, city stays).

## Capabilities and Constraints

- Not on the App Store or Google Play yet: store badges are disabled "Coming soon" until real links exist.
- No logo asset yet: the wordmark is lowercase "roam" in Outfit ExtraBold as a text placeholder.
- No real screenshots, testimonials, customer counts or press. Do not invent any. Demo stays on the page are sample data and are labelled so.
- Payments are test mode only: do not claim live payments or taxes.

## Brand Commitments

Existing design system is binding: tokens in `src/global.css` (yellow primary, violet secondary, ink/white surfaces, dark mode), Plus Jakarta Sans, Outfit for the wordmark only, radii 12/16/24.

## Evidence on Hand

Seeded sample stays and policies in `studio/seed/`; design mockups in `assets/prompt-imgs/`. Stay photos are Unsplash placeholders. No real metrics.

## Product Principles

- The sentence is the product: show it working before explaining it.
- Exact things are filters, feelings are ranking.
- Quote, never paraphrase, policy.
- Say only what exists today.
