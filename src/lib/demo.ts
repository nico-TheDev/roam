// One wording for the demo label, so every screen says the same thing.
export const DEMO_NOTICE = "Stripe test mode, sample listings.";

export const DEMO_DETAIL =
  "Roam is a demo. Payments run in Stripe test mode, so no real money moves, and the stays and photos are samples.";

// Plain-language privacy summary. Keep it in step with what the app really stores (see AGENTS.md).
export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: "Your account",
    body: "Your name, email and profile photo are held by Clerk, our sign-in provider. Your saved stays are kept on your account.",
  },
  {
    title: "What you type",
    body: "Search sentences and policy questions are sent to our server and to DeepSeek so they can be read. We don't save the text and we don't send it to analytics.",
  },
  {
    title: "Bookings and payments",
    body: "Dates, guests and the amount paid are stored in our database. Card details go straight to Stripe and never reach Roam. In this demo, payments are test mode only.",
  },
  {
    title: "Usage analytics",
    body: "PostHog records which screens and actions are used, tied to your account. Events never include what you type, names, emails, dates or card data.",
  },
  {
    title: "Hosts",
    body: "A host's name, bio and stays are public. Hosts see current bookings on their stays with dates, guests and amount, never guest details.",
  },
  {
    title: "Deleting your data",
    body: "Delete account in Settings removes your sign-in account.",
  },
];

// Shared reviewer account on the Clerk dev instance. `+clerk_test` emails accept the fixed code 424242 for the new-device check.
export const DEMO_LOGIN = { email: "demo+clerk_test@example.com", password: "RoamDemo-2026-Stay", code: "424242" };
export const DEMO_LOGIN_HINT = `Reviewing the demo? Email ${DEMO_LOGIN.email}, password ${DEMO_LOGIN.password}, code ${DEMO_LOGIN.code}.`;
