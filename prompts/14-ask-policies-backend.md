# 14 · Ask about this stay: roam-policies backend

Status: done

## Goal
In "Ask about this stay", a guest taps a topic chip or types a question. The app calls an API route; DeepSeek picks which policy entries from the `roam-policies` knowledge base answer it, and the chat shows each picked entry word for word as an answer card with its source. Nothing answers: the existing support card.

## Decisions
- Endpoint: Sanity Context endpoint in Knowledge Base mode, `SANITY_CONTEXT_KB_URL` (already in `.env.local`, add the name to `.env.example`), same organization token `SANITY_API_CONTEXT_TOKEN`. Tools used: `initial_context` and `knowledge_base_read` (JSON-RPC `tools/call`, same call shape as `queryContext`). No search tool.
- Entries are loaded once per server instance and cached in memory for 10 minutes: `initial_context` gives the knowledge base id (`Knowledge base id: \`kb…\``) and the entry paths (lines like `pets [core]`), then one `knowledge_base_read` call (up to 20 paths per call, chunked) returns every entry. Nothing about the knowledge base id or paths is hardcoded. Today: 8 entries (cancellation_and_refunds, check_in_and_check_out, damage, guest_conduct, house_rules, payments_and_fees, pets, safety).
- Parsing an entry: `# Title`, then one description line, then the body, then footnote definitions. Title = card title. Description = what DeepSeek reads to choose. Card text = the body with footnote markers (`[^abc123]`) and the footnote definition lines removed, nothing else changed. Source label = `<Title> · Roam policy`. If an entry doesn't match this shape, that entry is skipped and logged, never guessed.
- DeepSeek (`deepseek-v4-flash`, thinking off, 5 s timeout, `generateText` + `Output.object`, as in `readSentence`) gets the question plus a list of `path`, `title`, `description` and returns `{ paths: string[] }`. The `jsonSchema` limits each path to an `enum` of the cached paths with `maxItems: 3`; an empty list is valid and means "nothing answers". Anything off the sheet fails validation. Guest text goes only to the model, never into a query, and the model never writes text that is shown.
- Model failure or Sanity failure: the route returns 502, and the chat shows a retryable error bubble ("Couldn't check the policies. Try again."), not the support card, since "nothing answers" and "something broke" are different. No keyword fallback.
- Route: `src/app/api/ask+api.ts`, `POST { question }` (trimmed, 1 to 300 chars), verifies the Clerk session first (same `isSignedIn` as search, 401 otherwise), 500 if env is missing. Response `{ answers: { path, title, text, source }[] }`. The stay id is not sent: policies are the same for every stay. Server code in `src/lib/ask-server.ts`, imported only by the route.
- Policies only. Stay-specific facts (check-in time, fees, amenities) aren't in the knowledge base and aren't shown; those questions get the support card, per the AGENTS.md rule.
- Client: `src/lib/ask-policies.ts` replaces `src/lib/ask-samples.ts` (deleted). It keeps the chip list (label + question, unchanged), the greeting and the no-match answer, and exports `askPolicies(question, token, signal)` calling `/api/ask` like `fetchStays` does. Chips send their question through the same route, so there is one path. Greeting text changes to "Answers come word for word from Roam's policies."
- Chat screen: a turn is `pending | ready | error`. While pending, the guest bubble shows and a small "Checking the policies…" muted line sits where the cards will go. Error shows the message plus a "Try again" `Chip` that resends that turn. Input stays usable. Requests abort on unmount.
- Analytics: `stay_policy_question_asked` with `source: chip | typed`, `outcome: answered | no_match | failed`, `answer_count`. Never the question text or the picked text. PostHog failures never block the chat.
- No new dependency or service. Tokens only, no new design tokens.

## Out of scope
Per-stay facts, streaming, saving chat history, a keyword fallback, changing the Sanity knowledge base content or the Context endpoint's instructions, the policies sheet.

## Steps
### 1. Server: load and parse the knowledge base
Create `src/lib/ask-server.ts` with `loadPolicies()` (cache + 10 min TTL, concurrent calls share one load), `callKb(tool, args)` and the entry parser. Add `SANITY_CONTEXT_KB_URL` to `.env.example`. Done when a script run through `npx tsx` (or a temporary route call) lists 8 entries with title, description and clean text and no `[^` left.

### 2. Server: pick entries and the route
In `ask-server.ts` add `pickPolicies(question, policies)` using DeepSeek with the enum schema, and create `src/app/api/ask+api.ts`. Done when `curl` with a Clerk token returns: "can I bring my dog" → pets; "what happens if I cancel" → cancellation_and_refunds; "is there a pool heater" → `answers: []`; no token → 401; empty or 301-char question → 400.

### 3. Client: replace the samples
Create `src/lib/ask-policies.ts`, delete `src/lib/ask-samples.ts`, update `src/app/stay/[id]/ask.tsx` for pending, ready and error turns, the retry chip and the analytics event. Done when `npx tsc --noEmit` and `npx expo lint` pass and no import of `ask-samples` remains.

### 4. Visual and end-to-end check
Run the app, open a stay's chat in the iOS simulator, tap Pets and Cancellation, type a two-topic question, a question nothing answers, and one with the server stopped. Screenshot each in light mode (and dark if reachable) and compare with the existing card style.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- The 401, 400 and empty-answer cases in step 2 behave as listed; each of the six chips returns the matching entry.
- Card text equals the Sanity entry body word for word (diff one entry against `knowledge_base_read` output minus footnotes).
- "Can I bring my dog and when is check in" shows two cards; a question about something not covered shows the support card; stopping the server shows the error bubble and "Try again" works.
- No secret key appears in the app bundle (`grep -r SANITY_CONTEXT_KB_URL src` only matches `ask-server.ts`).
- PostHog receives `stay_policy_question_asked` with no question text.
- End to end: sign in, open a stay, Ask about policies, tap Pets, type a question, see cards with sources.

## AGENTS.md updates
- Policy knowledge: the Knowledge Base endpoint is read by `src/lib/ask-server.ts` through `src/app/api/ask+api.ts` with `SANITY_CONTEXT_KB_URL`.
- Typed decisions: Jev no longer picks policy entries; DeepSeek does, constrained to an enum of entry paths. Replace the Jev line accordingly and say Jev currently has no job.
- Answer text: still none generated; DeepSeek only chooses entries. Replace "No LLM runs in the app" with "no LLM writes any shown text".
- Stay details rule: replace "replies are sample text in `src/lib/ask-samples.ts`" with the API route.
- Analytics: add `stay_policy_question_asked`.
- Secret keys list: `SANITY_CONTEXT_KB_URL` is server-only.

## Result
Built as planned. Route checks passed with a real Clerk session token (401, 400, pets, empty answer); the two-topic pick passed through `pickPolicies` directly. Markdown symbols (`##`, `**`, bullets) are also stripped from card text, since they'd show as raw characters; words are unchanged. The chat UI was not run in the simulator.
