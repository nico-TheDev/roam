// Mocked authentication. The only file that changes when Clerk replaces it.
// Test values: verification code 123456 succeeds; sign in fails for wrong@example.com.

export type AuthResult = { ok: true } | { ok: false; error: string };
export type Provider = "google" | "apple";

export const CODE_LENGTH = 6;
const MOCK_CODE = "123456";
const FAILING_EMAIL = "wrong@example.com";
const DELAY_MS = 900;

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
const ok: AuthResult = { ok: true };

export async function signUp(_input: { name: string; email: string; password: string }): Promise<AuthResult> {
  await wait();
  return ok;
}

export async function verifyCode(_email: string, code: string): Promise<AuthResult> {
  await wait();
  return code === MOCK_CODE ? ok : { ok: false, error: "That code is not right. Check it and try again." };
}

export async function resendCode(_email: string): Promise<AuthResult> {
  await wait();
  return ok;
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  await wait();
  return input.email.trim().toLowerCase() === FAILING_EMAIL
    ? { ok: false, error: "We couldn't sign you in with that email and password." }
    : ok;
}

export async function signInWithProvider(_provider: Provider): Promise<AuthResult> {
  await wait();
  return ok;
}
