import { verifyClientId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-accent/10 bg-base-900 p-8 text-center shadow-panel">
        <h1 className="text-lg font-semibold text-loss">{title}</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const clientId = typeof searchParams.client_id === "string" ? searchParams.client_id : "";
  const redirectUri = typeof searchParams.redirect_uri === "string" ? searchParams.redirect_uri : "";
  const responseType = typeof searchParams.response_type === "string" ? searchParams.response_type : "";
  const codeChallenge = typeof searchParams.code_challenge === "string" ? searchParams.code_challenge : "";
  const codeChallengeMethod = typeof searchParams.code_challenge_method === "string" ? searchParams.code_challenge_method : "";
  const state = typeof searchParams.state === "string" ? searchParams.state : "";
  const scope = typeof searchParams.scope === "string" ? searchParams.scope : "";
  const resource = typeof searchParams.resource === "string" ? searchParams.resource : "";

  if (responseType !== "code") {
    return <ErrorScreen title="Unsupported request" message={`response_type must be "code".`} />;
  }
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return <ErrorScreen title="Unsupported request" message="This server requires PKCE with S256." />;
  }

  const client = await verifyClientId(clientId);
  if (!client) {
    return <ErrorScreen title="Unknown client" message="This app isn't registered with Card Tracker." />;
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return <ErrorScreen title="Invalid redirect" message="That redirect address wasn't registered by this app." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-accent/20 bg-base-900 bg-holo p-8 shadow-panel">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-foil text-base-950 font-bold">
            $
          </div>
          <h1 className="text-lg font-semibold text-white">Authorize {client.clientName || "this app"}</h1>
          <p className="mt-2 text-sm text-muted">
            {client.clientName || "This app"} wants to read and add data in your Card Business Tracker —
            inventory, revenue, expenses, and lot buys.
          </p>
        </div>

        <form method="POST" action="/api/oauth/authorize" className="space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="resource" value={resource} />
          <button
            type="submit"
            name="decision"
            value="allow"
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-base-950 transition hover:bg-accent-soft"
          >
            Allow
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="w-full rounded-lg border border-accent/20 px-4 py-2.5 text-sm text-muted transition hover:text-white"
          >
            Deny
          </button>
        </form>
      </div>
    </div>
  );
}
