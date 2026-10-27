import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { PostHogProvider } from "posthog-react-native";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { posthogLog } from "@/lib/posthog-logs";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local (names in .env.example), then restart the dev server.",
  );
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Runtime loading also covers Expo Go, where the app.json font plugin has no effect.
  // Names must match the --font-* tokens and text-* utilities in global.css.
  const [loaded, error] = useFonts({
    "PlusJakartaSans-Regular": require("../../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("../../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("../../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Outfit-ExtraBold": require("../../assets/fonts/Outfit-ExtraBold.ttf"),
  });

  if (!loaded && !error) return null;
  const routes = (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Routes />
    </ClerkProvider>
  );

  return posthog ? <PostHogProvider client={posthog}>{routes}</PostHogProvider> : routes;
}

// Waits for Clerk to restore the session from the token cache before choosing a route group, so a signed-in
// cold start never flashes onboarding. The splash screen stays up until then.
function Routes() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const previousSignedIn = useRef<boolean | null>(null);
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) return;

    const signedIn = !!isSignedIn;
    // Wait for Clerk to expose the authenticated user before treating the session transition as complete.
    if (signedIn && !user) return;

    if (signedIn && user && identifiedUserId.current !== user.id) {
      posthog?.identify(user.id, {
        $set: {
          ...(user.primaryEmailAddress ? { email: user.primaryEmailAddress.emailAddress } : {}),
          ...(user.fullName ? { name: user.fullName } : {}),
        },
      });
      identifiedUserId.current = user.id;
      if (previousSignedIn.current === false) {
        posthogLog.info("authenticated_session_activated", { transition: "sign_in" });
      }
    } else if (previousSignedIn.current === true && !signedIn) {
      posthog?.reset();
      identifiedUserId.current = null;
    }

    previousSignedIn.current = signedIn;
  }, [isLoaded, isSignedIn, isUserLoaded, user]);

  useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync();
  }, [isLoaded]);

  if (!isLoaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="design-system" options={{ headerShown: true }} />
    </Stack>
  );
}
