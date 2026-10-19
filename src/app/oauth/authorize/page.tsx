import { verifyClientId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-bad-text">{title}</h1>
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="MVP Card Collectors" width={96} height={96} className="mx-auto mb-5 h-24 w-24 object-contain" />
          <p className="eyebrow">Connector request</p>
          <h1 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-fg">
            Authorize {client.clientName || "this app"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {client.clientName || "This app"} wants to read and add data in your Card Business Tracker — inventory, revenue, expenses,
            and lot buys.
          </p>
        </div>

        <form method="POST" action="/api/oauth/authorize" className="space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="resource" value={resource} />
          <button type="submit" name="decision" value="allow" className="btn-gold w-full py-3">
            Allow
          </button>
          <button type="submit" name="decision" value="deny" className="btn-ghost w-full py-3 text-muted">
            Deny
          </button>
        </form>
      </div>
    </div>
  );
}
