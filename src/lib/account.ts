// Account hooks for the Profile tab and its sheets. Clerk is the source of truth; hooks return AuthResult so
// screens only render state. Screens never navigate after sign out or delete: the Stack.Protected guards do.
import { useReverification, useSession, useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { AuthResult, describe, fail, GENERIC_ERROR, splitName } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

const ok: AuthResult = { ok: true };
type ClerkError = Parameters<typeof describe>[0];

export function useUpdateName() {
  const { user } = useUser();
  return useCallback(
    async (fullName: string): Promise<AuthResult> => {
      if (!user) return fail(GENERIC_ERROR);
      const { firstName, lastName = "" } = splitName(fullName);
      try {
        // A one-word name must clear the old last name, so lastName is always sent.
        await user.update({ firstName, lastName });
        posthog?.capture("profile_updated", { field: "name" });
        return ok;
      } catch (e) {
        return fail(describe(e as ClerkError));
      }
    },
    [user],
  );
}

/** Library picker (no permission prompt needed). Cancelling resolves ok without a change. */
export function useProfilePhoto() {
  const { user } = useUser();

  const pick = useCallback(async (): Promise<AuthResult> => {
    if (!user) return fail(GENERIC_ERROR);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
        exif: false,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return ok;
      if (!asset.base64) return fail(GENERIC_ERROR);
      // The picker returns a JPEG when base64 is requested.
      await user.setProfileImage({ file: `data:image/jpeg;base64,${asset.base64}` });
      posthog?.capture("profile_updated", { field: "photo" });
      return ok;
    } catch (e) {
      return fail(describe(e as ClerkError));
    }
  }, [user]);

  const remove = useCallback(async (): Promise<AuthResult> => {
    if (!user) return fail(GENERIC_ERROR);
    try {
      await user.setProfileImage({ file: null });
      posthog?.capture("profile_photo_removed");
      return ok;
    } catch (e) {
      return fail(describe(e as ClerkError));
    }
  }, [user]);

  return { pick, remove, hasPhoto: !!user?.hasImage };
}

export type Device = {
  id: string;
  current: boolean;
  label: string;
  place: string | null;
  lastActiveAt: Date;
};

export type DevicesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; devices: Device[] };

/** Active sessions for the signed-in user. With multi-session off, each row is one device. */
export function useDevices() {
  const { user } = useUser();
  const { session } = useSession();
  const [state, setState] = useState<DevicesState>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user || !session) return;
    let cancelled = false;
    user
      .getSessions()
      .then((sessions) => {
        if (cancelled) return;
        const devices = sessions
          .filter((s) => s.status === "active")
          .map<Device>((s) => {
            const a = s.latestActivity;
            const kind = a.isMobile ? "Phone" : a.deviceType || "Device";
            return {
              id: s.id,
              current: s.id === session.id,
              label: a.browserName ? `${kind} · ${a.browserName}` : kind,
              place: [a.city, a.country].filter(Boolean).join(", ") || null,
              lastActiveAt: s.lastActiveAt,
            };
          })
          // This device first, then most recently active.
          .sort((x, y) => Number(y.current) - Number(x.current) || +y.lastActiveAt - +x.lastActiveAt);
        setState({ status: "ready", devices });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [user, session, version]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setVersion((v) => v + 1);
  }, []);

  const revokeOthers = useCallback(async (): Promise<AuthResult> => {
    if (!user || !session) return fail(GENERIC_ERROR);
    try {
      const sessions = await user.getSessions();
      const others = sessions.filter((s) => s.id !== session.id && s.status === "active");
      await Promise.all(others.map((s) => s.revoke()));
      posthog?.capture("devices_signed_out", { count: others.length });
      reload();
      return ok;
    } catch (e) {
      return fail(describe(e as ClerkError));
    }
  }, [user, session, reload]);

  return { state, reload, revokeOthers };
}

type Reverification = { complete: () => void; cancel: () => void; level?: string };

/**
 * Deletes the account. Clerk may ask for a fresh credential first: `needsPassword` turns true and the sheet shows a
 * password field that calls `confirmPassword`. Accounts without a password (Google) must sign in again first.
 */
export function useDeleteAccount() {
  const { user } = useUser();
  const { session } = useSession();
  const [pending, setPending] = useState<Reverification | null>(null);
  const runDelete = useReverification(() => user!.delete(), {
    onNeedsReverification: (params: Reverification) => setPending(params),
  });

  const available = !!user?.deleteSelfEnabled;

  const remove = useCallback(async (): Promise<AuthResult> => {
    if (!user || !user.deleteSelfEnabled) return fail(GENERIC_ERROR);
    try {
      await runDelete();
      posthog?.capture("account_deleted");
      return ok;
    } catch (e) {
      // Cancelled reverification and failed deletes both end here; the account still exists.
      posthog?.capture("account_delete_failed", { reason: pending ? "reverification" : "error" });
      setPending(null);
      return fail(
        pending ? "We couldn't confirm it's you, so your account wasn't deleted." : describe(e as ClerkError),
      );
    }
  }, [user, runDelete, pending]);

  const confirmPassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      if (!session || !pending) return fail(GENERIC_ERROR);
      try {
        await session.startVerification({ level: "first_factor" });
        const attempt = await session.attemptFirstFactorVerification({ strategy: "password", password });
        if (attempt.status !== "complete") return fail(GENERIC_ERROR);
        const retry = pending;
        setPending(null);
        retry.complete();
        return ok;
      } catch (e) {
        return fail(describe(e as ClerkError));
      }
    },
    [session, pending],
  );

  const cancelReverification = useCallback(() => {
    pending?.cancel();
    setPending(null);
  }, [pending]);

  return {
    available,
    hasPassword: !!user?.passwordEnabled,
    needsPassword: !!pending,
    remove,
    confirmPassword,
    cancelReverification,
  };
}

/** "Active now", "5 min ago", "3 days ago", or the date once it is older than a month. */
export function lastActiveLabel(date: Date, now = Date.now()) {
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 2) return "Active now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return days === 1 ? "Yesterday" : `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
