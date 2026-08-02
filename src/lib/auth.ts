export const SESSION_COOKIE = "card_tracker_session";

/**
 * Deterministic session token derived from the app password + a secret.
 * We don't need per-login randomness for a single-user tool: the cookie is
 * httpOnly + secure and effectively just proves the visitor typed the right
 * password. Uses Web Crypto (`crypto.subtle`) so this works identically in
 * the Node.js runtime (API routes) and the Edge runtime (middleware).
 */
export async function computeSessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const data = new TextEncoder().encode(`${password}::${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidPassword(candidate: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD ?? "";
  // Not constant-time, but this gates a personal inventory tool, not a bank.
  return expected.length > 0 && candidate === expected;
}
