import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "crypto";

// oauth.ts reads OAUTH_SIGNING_SECRET lazily (inside each sign/verify call),
// not at import time, so setting it here before any test runs is sufficient.
process.env.OAUTH_SIGNING_SECRET = "test-oauth-secret";

import {
  signClientId,
  verifyClientId,
  signAuthCode,
  verifyAuthCode,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyPkce,
} from "../oauth";

test("signClientId / verifyClientId round-trips redirect URIs and client name", async () => {
  const clientId = await signClientId({ redirectUris: ["https://claude.ai/callback"], clientName: "Claude" });
  const client = await verifyClientId(clientId);
  assert.deepEqual(client?.redirectUris, ["https://claude.ai/callback"]);
  assert.equal(client?.clientName, "Claude");
});

test("verifyClientId rejects a garbage token", async () => {
  const client = await verifyClientId("not-a-real-token");
  assert.equal(client, null);
});

test("verifyClientId rejects a token signed as a different type (e.g. an access token)", async () => {
  const accessToken = await signAccessToken({ clientId: "abc" });
  const client = await verifyClientId(accessToken);
  assert.equal(client, null);
});

test("signAuthCode / verifyAuthCode round-trips the grant details", async () => {
  const code = await signAuthCode({
    clientId: "client-1",
    redirectUri: "https://claude.ai/callback",
    codeChallenge: "abc123",
    resource: "https://example.com/api/mcp",
  });
  const grant = await verifyAuthCode(code);
  assert.equal(grant?.clientId, "client-1");
  assert.equal(grant?.redirectUri, "https://claude.ai/callback");
  assert.equal(grant?.codeChallenge, "abc123");
});

test("signAccessToken / verifyAccessToken round-trips clientId and scope", async () => {
  const token = await signAccessToken({ clientId: "client-1", scope: "mcp" });
  const grant = await verifyAccessToken(token);
  assert.equal(grant?.clientId, "client-1");
  assert.equal(grant?.scope, "mcp");
});

test("an authorization code is not accepted as an access token", async () => {
  const code = await signAuthCode({ clientId: "client-1", redirectUri: "https://x", codeChallenge: "y" });
  const grant = await verifyAccessToken(code);
  assert.equal(grant, null);
});

test("an access token is not accepted as a refresh token", async () => {
  const access = await signAccessToken({ clientId: "client-1" });
  const grant = await verifyRefreshToken(access);
  assert.equal(grant, null);
});

test("tokens signed with a different secret are rejected", async () => {
  const token = await signAccessToken({ clientId: "client-1" });
  const originalSecret = process.env.OAUTH_SIGNING_SECRET;
  process.env.OAUTH_SIGNING_SECRET = "a-completely-different-secret";
  const grant = await verifyAccessToken(token);
  process.env.OAUTH_SIGNING_SECRET = originalSecret;
  assert.equal(grant, null);
});

test("verifyPkce matches a correct S256 code_verifier / code_challenge pair", () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(verifyPkce(verifier, challenge), true);
});

test("verifyPkce rejects a mismatched code_verifier", () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(verifyPkce("some-other-verifier", challenge), false);
});
