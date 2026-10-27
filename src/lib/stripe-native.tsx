// The only file that imports the Stripe native SDK. A `.web.tsx` twin gives the web build (which also bundles the
// API routes for deployment) an inert version, because the SDK has native-only modules.
export { PaymentSheetError, StripeProvider, useStripe } from "@stripe/stripe-react-native";
