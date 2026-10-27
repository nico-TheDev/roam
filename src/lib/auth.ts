// Clerk-backed auth for the custom screens. Hooks return AuthResult so screens only render state.
// Screens never navigate after success: the Stack.Protected guards in _layout.tsx react to the session.
import { useClerk, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { useCallback } from "react";
import { posthog } from "@/lib/posthog";

export type AuthResult = { ok: true } | { ok: false; error: string };
export type Provider = "google" | "apple";
export type VerifyFlow = "sign-up" | "sign-in";

export const CODE_LENGTH = 6;

const ok: AuthResult = { ok: true };
const GENERIC_ERROR = "Something went wrong. Try again in a moment.";
const TASK_ERROR = "We couldn't finish setting up your account. Contact support and we'll sort it out.";

const fail = (error: string) => ({ ok: false, error }) as const;

// Clerk's long messages are written for end users ("Password has been found in an online data breach...").
function describe(error: { errors?: { longMessage?: string; message?: string }[]; message?: string } | null | undefined) {
  const first = error?.errors?.[0];
  return first?.longMessage ?? first?.message ?? error?.message ?? GENERIC_ERROR;
}

// A session task (for example forced MFA setup) has no screen yet; none are enabled on the instance.
const finishNavigate = ({ session }: { session?: { currentTask?: unknown } | null }) => {
  if (session?.currentTask) throw new Error("session-task");
};

/** "Adrian Hajdin" → first "Adrian", last "Hajdin". One word is first name only. */
export function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ");
  return lastName ? { firstName, lastName } : { firstName };
}

export function useSignUpFlow() {
  const { signUp } = useSignUp();

  const start = useCallback(
    async (input: { name: string; email: string; password: string }): Promise<AuthResult> => {
      const created = await signUp.password({
        emailAddress: input.email,
        password: input.password,
        ...splitName(input.name),
      });
      if (created.error) return fail(describe(created.error));
      const sent = await signUp.verifications.sendEmailCode();
      return sent.error ? fail(describe(sent.error)) : ok;
    },
    [signUp],
  );

  const resend = useCallback(async (): Promise<AuthResult> => {
    const sent = await signUp.verifications.sendEmailCode();
    return sent.error ? fail(describe(sent.error)) : ok;
  }, [signUp]);

  const verify = useCallback(
    async (code: string): Promise<AuthResult> => {
      const verified = await signUp.verifications.verifyEmailCode({ code });
      if (verified.error) return fail(describe(verified.error));
      if (signUp.status !== "complete") return fail(GENERIC_ERROR);
      try {
        const done = await signUp.finalize({ navigate: finishNavigate });
        if (done.error) return fail(describe(done.error));
        posthog?.capture("account_registered", { auth_method: "email" });
        return ok;
      } catch {
        return fail(TASK_ERROR);
      }
    },
    [signUp],
  );

  return { start, resend, verify };
}

export type SignInOutcome = { ok: true; next: "home" | "verify" } | { ok: false; error: string };

export function useSignInFlow() {
  const { signIn } = useSignIn();

  const start = useCallback(
    async (input: { email: string; password: string }): Promise<SignInOutcome> => {
      const attempt = await signIn.password({ emailAddress: input.email, password: input.password });
      if (attempt.error) return fail(describe(attempt.error));

      if (signIn.status === "complete") {
        try {
          const done = await signIn.finalize({ navigate: finishNavigate });
          if (done.error) return fail(describe(done.error));
          posthog?.capture("user_signed_in", { auth_method: "password" });
          return { ok: true, next: "home" };
        } catch {
          return fail(TASK_ERROR);
        }
      }
      // Device trust: a new device must confirm with an emailed code.
      if (signIn.status === "needs_client_trust") {
        const sent = await signIn.mfa.sendEmailCode();
        return sent.error ? fail(describe(sent.error)) : { ok: true, next: "verify" };
      }
      return fail(GENERIC_ERROR);
    },
    [signIn],
  );

  const resend = useCallback(async (): Promise<AuthResult> => {
    const sent = await signIn.mfa.sendEmailCode();
    return sent.error ? fail(describe(sent.error)) : ok;
  }, [signIn]);

  const verify = useCallback(
    async (code: string): Promise<AuthResult> => {
      const verified = await signIn.mfa.verifyEmailCode({ code });
      if (verified.error) return fail(describe(verified.error));
      if (signIn.status !== "complete") return fail(GENERIC_ERROR);
      try {
        const done = await signIn.finalize({ navigate: finishNavigate });
        if (done.error) return fail(describe(done.error));
        posthog?.capture("user_signed_in", { auth_method: "email_verification" });
        return ok;
      } catch {
        return fail(TASK_ERROR);
      }
    },
    [signIn],
  );

  return { start, resend, verify };
}

/** Browser SSO. Cancelling the browser is not an error: it resolves ok without a session. */
export function useProviderAuth() {
  const { startSSOFlow } = useSSO();

  return useCallback(
    async (provider: Provider): Promise<AuthResult> => {
      if (provider !== "google") return fail("That sign in isn't available yet.");
      try {
        const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google" });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          posthog?.capture("user_signed_in", { auth_method: "google" });
        }
        return ok;
      } catch (e) {
        return fail(describe(e as Parameters<typeof describe>[0]));
      }
    },
    [startSSOFlow],
  );
}

export function useSignOut() {
  const { signOut } = useClerk();
  return useCallback(async (): Promise<AuthResult> => {
    try {
      await signOut();
      return ok;
    } catch {
      return fail(GENERIC_ERROR);
    }
  }, [signOut]);
}
