import { useEffect } from "react";
import { useRouter } from "expo-router";

// Stripe returns here after 3-D Secure or a bank redirect (`returnURL` in stay/[id]/book.tsx).
// The Stripe SDK reads the URL itself; this screen only keeps Expo Router from showing "unmatched route".
export default function StripeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }, [router]);

  return null;
}
