import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp-tools";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "card-tracker", version: "1.0.0" },
});

async function verifyToken(_req: Request, bearerToken?: string) {
  if (!bearerToken || !process.env.MCP_API_KEY) return undefined;
  if (bearerToken !== process.env.MCP_API_KEY) return undefined;
  return { token: bearerToken, clientId: "card-tracker-owner", scopes: [] };
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST };
