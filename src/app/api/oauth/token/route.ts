import { NextResponse } from "next/server";
import {
  verifyClientId,
  verifyAuthCode,
  verifyRefreshToken,
  verifyPkce,
  signAccessToken,
  signRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

// OAuth 2.1 token endpoint. Public — every credential exchanged here is a
// signed, self-verifying token (see src/lib/oauth.ts), so there's no server
// state to protect at this URL beyond validating the credentials presented.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return oauthError("invalid_request", "Expected form-encoded body");

  const grantType = String(form.get("grant_type") ?? "");

  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const clientId = String(form.get("client_id") ?? "");
    const codeVerifier = String(form.get("code_verifier") ?? "");

    const client = await verifyClientId(clientId);
    if (!client) return oauthError("invalid_client", "Unknown client_id");

    const grant = await verifyAuthCode(code);
    if (!grant) return oauthError("invalid_grant", "Authorization code is invalid or expired");
    if (grant.clientId !== clientId) return oauthError("invalid_grant", "client_id does not match the code");
    if (grant.redirectUri !== redirectUri) return oauthError("invalid_grant", "redirect_uri does not match the code");
    if (!codeVerifier || !verifyPkce(codeVerifier, grant.codeChallenge)) {
      return oauthError("invalid_grant", "code_verifier does not match code_challenge");
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ clientId, scope: grant.scope, resource: grant.resource }),
      signRefreshToken({ clientId, scope: grant.scope, resource: grant.resource }),
    ]);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: grant.scope,
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    const clientId = String(form.get("client_id") ?? "");

    const grant = await verifyRefreshToken(refreshToken);
    if (!grant) return oauthError("invalid_grant", "Refresh token is invalid or expired");
    if (clientId && grant.clientId !== clientId) return oauthError("invalid_grant", "client_id does not match the refresh token");

    const [accessToken, newRefreshToken] = await Promise.all([
      signAccessToken({ clientId: grant.clientId, scope: grant.scope, resource: grant.resource }),
      signRefreshToken({ clientId: grant.clientId, scope: grant.scope, resource: grant.resource }),
    ]);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: newRefreshToken,
      scope: grant.scope,
    });
  }

  return oauthError("unsupported_grant_type", `grant_type "${grantType}" is not supported`);
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
