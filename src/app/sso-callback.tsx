import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

// Google sign in returns to `roam://sso-callback` (Clerk's default redirect). Clerk reads the URL through
// AuthSession; this screen only keeps Expo Router from showing "unmatched route" on Android.
export default function SsoCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/home" : "/sign-in"} />;
}
