import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp-tools";
import { verifyAccessToken } from "@/lib/oauth";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "card-tracker", version: "1.0.0" },
});

// Accepts either the long-lived static key (used by the local mcp-remote /
// Claude Desktop config) or a short-lived OAuth access token issued via
// /oauth/authorize + /api/oauth/token (used by Claude.ai's remote Connectors,
// which need no locally-running bridge at all).
async function verifyToken(_req: Request, bearerToken?: string) {
  if (!bearerToken) return undefined;

  if (process.env.MCP_API_KEY && bearerToken === process.env.MCP_API_KEY) {
    return { token: bearerToken, clientId: "card-tracker-owner", scopes: [] };
  }

  const grant = await verifyAccessToken(bearerToken);
  if (grant) {
    return { token: bearerToken, clientId: grant.clientId, scopes: grant.scope ? grant.scope.split(" ") : [] };
  }

  return undefined;
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST };
