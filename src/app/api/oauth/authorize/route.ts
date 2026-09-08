import { NextResponse } from "next/server";
import { verifyClientId, signAuthCode } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Handles the Allow/Deny decision from /oauth/authorize. Reached only by a
// browser that already holds a valid session cookie (this route sits behind
// the same cookie gate as the rest of the site) — that login is the entire
// authorization decision for this single-user server.
export async function POST(req: Request) {
  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const state = String(form.get("state") ?? "");
  const scope = String(form.get("scope") ?? "") || undefined;
  const resource = String(form.get("resource") ?? "") || undefined;
  const decision = String(form.get("decision") ?? "");

  const client = await verifyClientId(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const callback = new URL(redirectUri);
  if (state) callback.searchParams.set("state", state);

  if (decision !== "allow") {
    callback.searchParams.set("error", "access_denied");
    return NextResponse.redirect(callback, { status: 303 });
  }

  const code = await signAuthCode({ clientId, redirectUri, codeChallenge, scope, resource });
  callback.searchParams.set("code", code);
  return NextResponse.redirect(callback, { status: 303 });
}
