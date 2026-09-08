import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

/**
 * A minimal, single-user OAuth 2.1 authorization server (PKCE + Dynamic
 * Client Registration) so Claude.ai's remote MCP Connectors can talk to
 * /api/mcp directly — no locally-run bridge process required.
 *
 * Deliberately stateless: every issued credential (client_id, authorization
 * code, access token, refresh token) is a signed JWT carrying everything
 * needed to validate it later. There's exactly one real user (whoever can
 * log into the site with the app password), so there's nothing to look up
 * in a database — a valid signature and an unexpired "exp" claim is the
 * whole trust model. Rotating OAUTH_SIGNING_SECRET invalidates every
 * previously issued credential at once.
 */

function secretKey(): Uint8Array {
  const secret = process.env.OAUTH_SIGNING_SECRET;
  if (!secret) throw new Error("OAUTH_SIGNING_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

type TokenType = "client" | "code" | "access" | "refresh";

async function sign<P extends object>(typ: TokenType, payload: P, expiresIn: string): Promise<string> {
  return new SignJWT({ ...payload, typ })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

async function verify<T extends object>(token: string, typ: TokenType): Promise<T | null> {
  try {
    const { payload } = await jwtVerify<T & { typ: TokenType }>(token, secretKey());
    if (payload.typ !== typ) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Dynamic Client Registration -------------------------------------------

export interface ClientPayload {
  redirectUris: string[];
  clientName?: string;
}

/** Client registrations never expire — a public client id is a stable identity, not a session. */
export async function signClientId(client: ClientPayload): Promise<string> {
  return sign("client", client, "100y");
}

export async function verifyClientId(clientId: string): Promise<ClientPayload | null> {
  return verify<ClientPayload>(clientId, "client");
}

// --- Authorization code ------------------------------------------------------

export interface CodePayload {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource?: string;
  scope?: string;
}

export async function signAuthCode(code: CodePayload): Promise<string> {
  return sign("code", code, "5m");
}

export async function verifyAuthCode(code: string): Promise<CodePayload | null> {
  return verify<CodePayload>(code, "code");
}

// --- Access / refresh tokens --------------------------------------------------

export interface GrantPayload {
  clientId: string;
  scope?: string;
  resource?: string;
}

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export async function signAccessToken(grant: GrantPayload): Promise<string> {
  return sign("access", grant, `${ACCESS_TOKEN_TTL_SECONDS}s`);
}

export async function verifyAccessToken(token: string): Promise<GrantPayload | null> {
  return verify<GrantPayload>(token, "access");
}

export async function signRefreshToken(grant: GrantPayload): Promise<string> {
  return sign("refresh", grant, "180d");
}

export async function verifyRefreshToken(token: string): Promise<GrantPayload | null> {
  return verify<GrantPayload>(token, "refresh");
}

// --- PKCE (S256 only) ---------------------------------------------------------

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}
