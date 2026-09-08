import { NextResponse } from "next/server";
import { signClientId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// RFC 7591 Dynamic Client Registration. Public by design — any MCP client
// can register itself as a "client" of this server; that alone grants no
// access. Access is only ever granted when the real owner logs in with the
// site password and approves the /oauth/authorize consent screen.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
      { status: 400 }
    );
  }
  for (const uri of body.redirect_uris) {
    if (typeof uri !== "string" || !/^https?:\/\//.test(uri)) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: `Invalid redirect_uri: ${uri}` },
        { status: 400 }
      );
    }
  }
  const clientName = typeof body.client_name === "string" ? body.client_name : undefined;

  const clientId = await signClientId({ redirectUris: body.redirect_uris, clientName });

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: body.redirect_uris,
      client_name: clientName,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201 }
  );
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
