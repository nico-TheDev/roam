import { Redirect } from "expo-router";

// Signing in leaves the URL at "/", which onboarding owned while signed out. Send it to Home.
export default function Index() {
  return <Redirect href="/home" />;
}
