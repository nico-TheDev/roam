# 12 · Ask about this stay (chat screen)

Status: done

Design: none attached. Layout follows the existing design system; attach a design if one exists and the plan will be checked against it.

## Goal
From a stay's details page, a guest taps "Ask about policies" and lands on a chat screen. They tap a topic chip (or type) and get answers as one card per topic, each with a source label, not a written paragraph. Replies are sample messages for now: no backend, no Jev, no network.

## Decisions
- Route: `src/app/stay/[id]/ask.tsx`, full-screen push in the root Stack inside the signed-in `Stack.Protected` group in `src/app/_layout.tsx`, next to `stay/[id]/index`. `id` param is the stay id.
- Entry: the "Ask about policies" `PolicyCard` on the stay screen now pushes `/stay/[id]/ask`. The cancellation card keeps opening the policies sheet (`stay/[id]/policies`, unchanged).
- Header: back `IconButton` (falls back to the stay screen), title "Ask about this stay", the stay title in `small` muted under it. Stay title comes from `getCachedStay(id)`; if missing, the generic header only.
- Topic chips (horizontal scroll row above the input, `Chip` `soft`): Cancellation, House rules, Pets, Check-in, Payments, Safety. Tapping one sends its question as a guest message ("What is the cancellation policy?") and adds the reply. Chips never fill the input.
- Reply shape: an assistant turn is a list of `AnswerCard`s, one per topic. No paragraph and no generated text. A card shows the topic title, the answer text, and a source label row (small icon + e.g. "House rules · Roam policy"). Stay-field answers use "From this stay's listing".
- Sample data: `src/lib/ask-samples.ts` holds a canned opening message, one sample answer per topic (title, text, source) and a `matchTopics(text)` keyword matcher in code for typed questions (a question that names two topics gets two cards). A question matching nothing gets a plain "Nothing in this stay's policies answers that. Contact Roam support." card with source "Roam support" (per AGENTS.md rule). All sample text is marked in code as placeholder to be replaced by real Sanity text.
- Input: `ChatInput` component, grey `bg-surface-alt` pill like `SearchField`, a `MessageCircle` icon on the left inside the field (as `SearchPill` uses `Sparkles`), placeholder "Ask about this stay", send button on the right (round, `bg-primary`, `ArrowUp` icon) disabled when empty. Submit on return key too.
- Chat state is local `useState` (list of turns); it is not persisted and resets when the screen closes.
- Keyboard: `KeyboardAvoidingView` (iOS `padding`) around the list and input; list is an inverted-free `ScrollView` that scrolls to the end after each turn. Bottom padding uses the safe-area inset.
- Motion: new turns use `useEntering` from `src/lib/motion.ts`; tappables use `PressableScale` (Chip already does).
- Analytics: none in this step (nothing is sent; guest text is never captured anyway). A `stay_policy_question_asked` event with `topic` only can come with the real backend.
- Tokens only: `bg-surface-alt` for guest bubbles' counterpart, `bg-secondary-soft` for answer cards (same family as `PolicyCard`), `bg-primary` for the guest bubble and send button, `rounded-lg`/`rounded-md`, `px-5` screen padding. No new tokens expected.

## Out of scope
Real answers (Sanity Context knowledge base, Jev topic choice), streaming, persistence, voice, analytics for questions, changing the policies sheet.

## Steps
### 1. Sample data
Create `src/lib/ask-samples.ts`: `Topic` type (`cancellation | house-rules | pets | check-in | payments | safety`), `topics` list with chip label and question, `Answer` type `{ topic, title, text, source }`, `answerFor(topic)`, `matchTopics(text)`, the no-match answer, and the opening assistant message. Done when `npx tsc --noEmit` passes and each topic returns an answer.

### 2. Components (export from `src/components/index.ts`, show in `/design-system` as a new section 20 "Ask chat")
- `AnswerCard`: `{ title, text, source }`, `bg-secondary-soft` rounded-md card, title `caption` semibold, text `body`, source row with `Icon` (`FileText`) and `micro` muted label.
- `ChatBubble`: guest message, right aligned, `bg-primary` rounded bubble, `text-on-primary`.
- `ChatInput`: message icon in the field, send button, `onSend(text)`.
Each is accessible (labels, roles) and works in dark mode through tokens.

### 3. Screen and navigation
Build `src/app/stay/[id]/ask.tsx` (header, scrolling turns, chip row, input). Register it in `src/app/_layout.tsx`. Change the "Ask about policies" card on `src/app/stay/[id]/index.tsx` to push `/stay/[id]/ask`. Done when tapping the card opens the chat, chips and typed questions add a guest bubble plus answer cards, and back returns to the stay.

### 4. Visual check
Open `/stay/<id>/ask` in the iOS simulator (`xcrun simctl openurl booted`), screenshot empty, after a chip tap, after a two-topic typed question, and with the keyboard open, in light and dark. List and fix differences.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Each of the six chips sends its question and shows exactly one answer card with a source label.
- Typed "can I bring my dog and when is check in" shows two cards; typed gibberish shows the support card.
- Send is disabled when the input is empty; return key sends; input clears after sending.
- Keyboard does not cover the input; list scrolls to the newest turn.
- Cancellation card still opens the policies sheet.
- End to end: sign in, Home, open a stay, tap Ask about policies, tap Pets, type a question, go back to the stay.

## AGENTS.md updates
- Design system routes: add `stay/[id]/ask` (sample chat, no backend yet).
- Shared components list: add `AnswerCard`, `ChatBubble`, `ChatInput`; update "all 18 design sections" count to match `/design-system`.
- Note that answers in the chat are sample text until the Context-backed backend replaces `src/lib/ask-samples.ts`.

## Result
Built as planned. Design section is number 20. Visual check covered the empty chat in the simulator (light mode); chip taps, typed questions, keyboard and dark mode were not exercised because taps can't be driven from here.
