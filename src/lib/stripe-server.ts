import Stripe from "stripe";

// Server only. Fetch-based HTTP and Web Crypto, because API routes don't run on Node's http module.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Test mode only until live payments are a deliberate change.
  if (!key.startsWith("sk_test_") && process.env.BOOKINGS_LIVE !== "1") {
    throw new Error("Refusing to use a live Stripe key: bookings are test mode only");
  }
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
