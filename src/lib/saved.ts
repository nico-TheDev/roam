// Saved stays: private per-user IDs kept in Clerk `unsafeMetadata.savedStayIds`. The property content stays in Sanity.
// Clerk caps metadata at 8 KB, so saves are capped at MAX_SAVED. Writes use `updateMetadata` (deep merge); `user.update`
// would replace the whole object. Screens share one optimistic copy so a heart set in search is filled on the stay too.
import { useUser } from "@clerk/expo";
import { useCallback, useSyncExternalStore } from "react";
import { GENERIC_ERROR } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

export const MAX_SAVED = 100;
const WRITE_DELAY_MS = 400;
const LIMIT_ERROR = `You can save up to ${MAX_SAVED} stays.`;

type User = NonNullable<ReturnType<typeof useUser>["user"]>;
type Store = { userId: string | null; pending: string[] | null; error: string | null };

let store: Store = { userId: null, pending: null, error: null };
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const set = (next: Partial<Store>) => {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Metadata is user-editable, so read it defensively: strings only, no duplicates, capped. */
function parse(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))].slice(0, MAX_SAVED);
}

function schedule(user: User) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    const sent = store.pending;
    if (!sent) return;
    try {
      // The copy stays until the app restarts, so hearts don't flicker while Clerk's user object catches up.
      await user.updateMetadata({ unsafeMetadata: { savedStayIds: sent } });
    } catch {
      // Roll back to what Clerk last confirmed.
      if (timer) clearTimeout(timer);
      timer = null;
      set({ pending: null, error: GENERIC_ERROR });
    }
  }, WRITE_DELAY_MS);
}

export function useSavedStays() {
  const { user } = useUser();
  const current = useSyncExternalStore(subscribe, () => store);

  const confirmed = parse(user?.unsafeMetadata?.savedStayIds);
  const ids = current.pending && current.userId === user?.id ? current.pending : confirmed;

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      if (!user) return;
      const base = store.pending && store.userId === user.id ? store.pending : parse(user.unsafeMetadata?.savedStayIds);
      const saving = !base.includes(id);
      if (saving && base.length >= MAX_SAVED) {
        set({ error: LIMIT_ERROR });
        return;
      }
      posthog?.capture("stay_favorite_toggled", { property_id: id, action: saving ? "saved" : "removed" });
      set({ userId: user.id, pending: saving ? [...base, id] : base.filter((s) => s !== id), error: null });
      schedule(user);
    },
    [user],
  );

  const dismissError = useCallback(() => set({ error: null }), []);

  return { ids, count: ids.length, isSaved, toggle, error: current.error, dismissError };
}
