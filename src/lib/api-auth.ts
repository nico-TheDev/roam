import { verifyToken } from "@clerk/backend";

/** The verified Clerk user id from the Bearer token, or null. Routes never trust a user id from the body. */
export async function getUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) return null;
  try {
    const { sub } = await verifyToken(token, { secretKey });
    return sub ?? null;
  } catch {
    return null;
  }
}
