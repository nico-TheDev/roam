// Sample messages for the "Ask about this stay" chat. There is no backend yet: every answer below is placeholder
// text to be replaced by the stay's own fields and Roam's policy text, word for word, with the same source labels.

export type Topic = "cancellation" | "house-rules" | "pets" | "check-in" | "payments" | "safety";

export type Answer = { topic: Topic | "none"; title: string; text: string; source: string };

export const topics: { topic: Topic; label: string; question: string; keywords: string[] }[] = [
  { topic: "cancellation", label: "Cancellation", question: "What is the cancellation policy?", keywords: ["cancel", "refund"] },
  { topic: "house-rules", label: "House rules", question: "What are the house rules?", keywords: ["rule", "quiet", "smok", "party", "parties", "noise"] },
  { topic: "pets", label: "Pets", question: "Can I bring my pet?", keywords: ["pet", "dog", "cat"] },
  { topic: "check-in", label: "Check-in", question: "How does check-in work?", keywords: ["check-in", "check in", "checkin", "check out", "checkout", "arrive", "key"] },
  { topic: "payments", label: "Payments", question: "How do payments work?", keywords: ["pay", "deposit", "charge", "price", "fee"] },
  { topic: "safety", label: "Safety", question: "What safety features does this stay have?", keywords: ["safe", "smoke alarm", "fire", "emergency"] },
];

const answers: Record<Topic, Answer> = {
  cancellation: {
    topic: "cancellation",
    title: "Cancellation",
    text: "Free cancellation. Full refund up to 7 days before check-in.",
    source: "Cancellation policy · Roam policy",
  },
  "house-rules": {
    topic: "house-rules",
    title: "House rules",
    text: "Quiet hours from 10 pm to 8 am. No smoking indoors. No parties or events.",
    source: "House rules · Roam policy",
  },
  pets: {
    topic: "pets",
    title: "Pets",
    text: "Pets are welcome. Please keep them off the furniture and clean up outdoors.",
    source: "Pet policy · Roam policy",
  },
  "check-in": {
    topic: "check-in",
    title: "Check-in",
    text: "Check-in is from 3 pm and check-out is by 11 am. You'll get self check-in instructions before you arrive.",
    source: "Check-in details · This stay's listing",
  },
  payments: {
    topic: "payments",
    title: "Payments",
    text: "You pay the nightly price plus the cleaning fee when you book. No other charges are added.",
    source: "Payment policy · Roam policy",
  },
  safety: {
    topic: "safety",
    title: "Safety",
    text: "Smoke and carbon monoxide alarms are installed. A first aid kit and fire extinguisher are in the kitchen.",
    source: "Safety · This stay's listing",
  },
};

const noMatch: Answer = {
  topic: "none",
  title: "No answer found",
  text: "Nothing in this stay's policies answers that. Contact Roam support and we'll help.",
  source: "Roam support",
};

export const greeting =
  "Pick a topic or type a question. Answers come straight from this stay's listing and Roam's policies.";

export const answerFor = (topic: Topic): Answer => answers[topic];

/** Topics a typed question mentions, in the order the chips show them. Nothing matched: one support card. */
export function answersFor(text: string): Answer[] {
  const lower = text.toLowerCase();
  const hits = topics.filter((t) => t.keywords.some((k) => lower.includes(k)));
  return hits.length ? hits.map((t) => answers[t.topic]) : [noMatch];
}
