import type { ReactNode } from "react";

// Payments are native-only. On web the booking sheet shows "payments aren't set up" and never calls these.
export const PaymentSheetError = { Canceled: "Canceled" } as const;

export function StripeProvider({ children }: { children: ReactNode; publishableKey: string; urlScheme?: string }) {
  return <>{children}</>;
}

const unsupported = async () => ({ error: { code: "Unsupported", message: "Payments are only available in the app." } });
export const useStripe = () => ({ initPaymentSheet: unsupported, presentPaymentSheet: unsupported });
