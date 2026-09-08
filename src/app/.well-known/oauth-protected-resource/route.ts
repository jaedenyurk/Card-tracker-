import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { getPublicOrigin } from "mcp-handler";

export const dynamic = "force-dynamic";

// RFC 9728 Protected Resource Metadata for /api/mcp. Tells a client which
// authorization server(s) can issue tokens this resource will accept — in
// our case, this same app's own authorization server.
const handler = (req: Request) =>
  protectedResourceHandler({ authServerUrls: [getPublicOrigin(req)] })(req);

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
