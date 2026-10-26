import { useRouter } from "expo-router";

/** After a successful auth: clear the auth screens off the stack and land on home, so back never returns to them. */
export function useEnterApp() {
  const router = useRouter();
  return () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace("/home");
  };
}
