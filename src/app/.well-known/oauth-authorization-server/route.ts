import { NextResponse } from "next/server";
import { getPublicOrigin } from "mcp-handler";

export const dynamic = "force-dynamic";

// RFC 8414 Authorization Server Metadata. Lets Claude.ai's connector setup
// (and any other OAuth-aware MCP client) discover how to talk to our
// single-user authorization server without any manual configuration.
export async function GET(req: Request) {
  const origin = getPublicOrigin(req);
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
