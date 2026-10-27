"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { usePlaidLink } from "react-plaid-link";
import { formatCents, inPeriod, type PeriodKey } from "@/lib/calculations";
import { readStoredPeriod, writeStoredPeriod } from "@/lib/periodPreference";
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES, isBulkSafe, type Suggestion } from "@/lib/bankFeed";

const inputClass =
  "rounded-[14px] border border-line bg-card px-3 py-2 text-sm text-fg transition-ui focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/[.22]";

const LINK_TOKEN_KEY = "plaid_link_token";

export type BankTab = "review" | "added" | "ignored";

export interface BankTxRow {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number; // cents; positive = money in, negative = money out
  account: string;
  category: string | null;
  linkedTo: "expense" | "revenue" | null;
  suggestion: Suggestion | null;
  duplicate: { id: string; description: string; date: string } | null;
}

export interface BankItemRow {
  id: string;
  institutionName: string;
  lastSyncedAt: string | null;
  syncError: string | null;
  accounts: { id: string; name: string; mask: string | null; type: string; tracked: boolean }[];
}

export interface BankRuleRow {
  id: string;
  merchantKey: string;
  direction: "IN" | "OUT";
  action: "ADD" | "IGNORE";
  category: string | null;
}

type Notice = { kind: "ok" | "error"; text: string };

const PERIODS: { key: PeriodKey; label: string; phrase: string }[] = [
  { key: "MONTH", label: "This Month", phrase: "this month" },
  { key: "YTD", label: "YTD", phrase: "this year" },
  { key: "ALL", label: "All-Time", phrase: "all time" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const formatMoney = (cents: number) => `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatCents(Math.abs(cents))}`;

async function request(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Couldn't reach the server" } };
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(LINK_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(LINK_TOKEN_KEY, token);
    else localStorage.removeItem(LINK_TOKEN_KEY);
  } catch {
    // Private mode etc.: only banks that sign in on their own site need this, and they'll just ask to reconnect.
  }
}

function SetupPanel() {
  const code = "rounded-md bg-inset px-1.5 py-0.5 font-mono text-[12px] text-fg";
  return (
    <div className="card space-y-4 p-6">
      <div>
        <p className="font-display text-base font-bold tracking-tight text-fg">One-time setup</p>
        <p className="mt-1 text-sm text-muted">
          The Bank Feed needs your Plaid keys. They stay on the server and are never shown on any page.
        </p>
      </div>
      <ol className="list-decimal space-y-2.5 pl-5 text-sm text-fg">
        <li>
          In the Plaid dashboard, open <span className="font-semibold">Developers → Keys</span> and copy your Client ID and the Secret for the
          environment you&apos;re using.
        </li>
        <li>
          In Vercel, open this project&apos;s <span className="font-semibold">Settings → Environment Variables</span> and add:
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
            <li><code className={code}>PLAID_CLIENT_ID</code> your Client ID</li>
            <li><code className={code}>PLAID_SECRET</code> the matching Secret</li>
            <li><code className={code}>PLAID_ENV</code> <code className={code}>sandbox</code> to test with fake banks, or <code className={code}>production</code> for your real accounts</li>
            <li>
              <code className={code}>PLAID_TOKEN_KEY</code> a random key that encrypts the bank access token. Make one by running{" "}
              <code className={code}>openssl rand -base64 32</code>
            </li>
            <li>
              <code className={code}>PLAID_REDIRECT_URI</code> (optional) <code className={code}>https://your-site/bank</code>, needed for banks that sign you in on their own
              website. Add the same address under Allowed redirect URIs in Plaid.
            </li>
          </ul>
        </li>
        <li>Redeploy, and this page will turn into the Connect screen.</li>
      </ol>
    </div>
  );
}

const ACCOUNT_KIND: Record<string, string> = {
  depository: "Bank account",
  credit: "Credit card",
  loan: "Loan",
  investment: "Investment",
};

// Which of each connected login's accounts this app should use. Only checked accounts are
// ever synced or stored; the rest of the login is never pulled in.
function AccountsCard({
  items,
  busy,
  onSave,
  onDisconnect,
}: {
  items: BankItemRow[];
  busy: string | null;
  onSave: (item: BankItemRow, accountIds: string[]) => void;
  onDisconnect: (item: BankItemRow) => void;
}) {
  const saved = (item: BankItemRow) => item.accounts.filter((a) => a.tracked).map((a) => a.id);
  const [draft, setDraft] = useState<Record<string, string[]>>(() => Object.fromEntries(items.map((i) => [i.id, saved(i)])));

  // Pick up the saved selection again after a save or sync refreshes the page data.
  useEffect(() => {
    setDraft(Object.fromEntries(items.map((i) => [i.id, saved(i)])));
  }, [items]);

  return (
    <div className="card p-5">
      <p className="font-display text-base font-bold tracking-tight text-fg">Accounts to use</p>
      <p className="mt-1 text-sm text-muted">
        Only the accounts you check here are imported. Transactions from anything unchecked are never saved to this app, so a
        personal account that shares a login stays out.
      </p>
      <ul className="mt-4 space-y-5">
        {items.map((item) => {
          const chosen = draft[item.id] ?? saved(item);
          const was = saved(item);
          const dirty = chosen.length !== was.length || chosen.some((id) => !was.includes(id));
          const none = was.length === 0;
          return (
            <li key={item.id} className={clsx(none && "rounded-[14px] bg-gold/[.10] p-4")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-fg">{item.institutionName}</p>
                  <p className="text-xs text-muted">
                    {item.lastSyncedAt
                      ? `Last synced ${new Date(item.lastSyncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                      : "Not synced yet"}
                  </p>
                </div>
                <button
                  onClick={() => onDisconnect(item)}
                  disabled={busy === item.id}
                  className="text-xs font-semibold text-bad-text hover:underline disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
              {none && <p className="mt-2 text-sm font-medium text-fg">Choose which accounts to use, then press Save to start importing.</p>}
              {item.syncError && <p className="mt-1 text-xs text-bad-text">{item.syncError}</p>}
              <ul className="mt-3 space-y-2">
                {item.accounts.map((a) => (
                  <li key={a.id}>
                    <label className="flex items-center gap-2.5 text-sm text-fg">
                      <input
                        type="checkbox"
                        checked={chosen.includes(a.id)}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [item.id]: e.target.checked ? [...chosen, a.id] : chosen.filter((id) => id !== a.id),
                          }))
                        }
                        className="accent-gold-deep"
                      />
                      <span>
                        {a.name}
                        {a.mask && <span className="text-muted"> ··{a.mask}</span>}
                      </span>
                      <span className="text-xs text-muted">{ACCOUNT_KIND[a.type] ?? a.type}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {(dirty || none) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onSave(item, chosen)}
                    disabled={busy != null || (none && chosen.length === 0)}
                    className="btn-gold btn-sm disabled:opacity-50"
                  >
                    {busy === `accounts-${item.id}` ? "Saving…" : "Save accounts"}
                  </button>
                  {dirty && !none && (
                    <button onClick={() => setDraft((d) => ({ ...d, [item.id]: was }))} className="text-xs font-semibold text-muted hover:underline">
                      Undo changes
                    </button>
                  )}
                  {dirty && was.some((id) => !chosen.includes(id)) && (
                    <span className="text-xs text-muted">Unchecked accounts lose their unreviewed transactions. Anything already added stays.</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewRow({
  row,
  busy,
  onAct,
}: {
  row: BankTxRow;
  busy: boolean;
  onAct: (id: string, body: Record<string, unknown>) => void;
}) {
  const money = row.amount > 0;
  const categories = money ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
  const suggestion = row.suggestion;
  const [category, setCategory] = useState(suggestion?.action === "ADD" ? suggestion.category ?? "" : "");
  const [remember, setRemember] = useState(true);
  const suggestIgnore = suggestion?.action === "IGNORE";

  return (
    <li className="space-y-3 px-5 py-4 transition-ui hover:bg-gold/[.05]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-fg">{row.merchantName || row.name}</p>
          <p className="text-xs text-muted">
            {formatDate(row.date)} · {row.account}
            {row.merchantName && row.merchantName !== row.name && <span> · {row.name}</span>}
          </p>
        </div>
        <p className={clsx("tabular-nums text-sm font-semibold", money ? "text-ok-text" : "text-fg")}>{formatMoney(row.amount)}</p>
      </div>

      {(suggestion || row.duplicate) && (
        <div className="flex flex-wrap items-center gap-2">
          {suggestion?.source === "rule" && <span className="chip bg-gold/[.14] text-gold-text">Saved rule</span>}
          {suggestion?.source === "plaid" && suggestIgnore && (
            <span className="chip bg-inset text-muted">Looks like a transfer or card payment</span>
          )}
          {suggestion?.source === "plaid" && !suggestIgnore && <span className="chip bg-inset text-muted">Suggested</span>}
          {row.duplicate && (
            <span className="chip bg-warn/[.16] text-fg">
              Looks already entered: {row.duplicate.description} · {formatDate(row.duplicate.date)}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Category"
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className={clsx(suggestIgnore ? "btn-ghost" : "btn-gold", "btn-sm disabled:opacity-50")}
          disabled={busy || !category}
          onClick={() => onAct(row.id, { action: "add", category, remember })}
        >
          Add as {money ? "revenue" : "expense"}
        </button>
        <button
          className={clsx(suggestIgnore ? "btn-gold" : "btn-ghost", "btn-sm disabled:opacity-50")}
          disabled={busy}
          onClick={() => onAct(row.id, { action: "ignore", remember })}
        >
          Ignore
        </button>
        {row.duplicate && (
          <button
            className="btn-ghost btn-sm disabled:opacity-50"
            disabled={busy}
            onClick={() => onAct(row.id, { action: "link", entryId: row.duplicate!.id })}
          >
            Same one, link it
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-gold-deep" />
          Remember for {row.merchantName || "this merchant"}
        </label>
      </div>
    </li>
  );
}

export function BankFeed({
  configured,
  items,
  rules,
  rows,
  counts,
  tab,
  stale,
  truncated,
}: {
  configured: boolean;
  items: BankItemRow[];
  rules: BankRuleRow[];
  rows: BankTxRow[];
  counts: Record<BankTab, Record<PeriodKey, number>>;
  tab: BankTab;
  stale: boolean;
  truncated: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | undefined>(undefined);
  const autoSynced = useRef(false);
  const [period, setPeriodState] = useState<PeriodKey>("MONTH");

  // Same shared period as the Dashboard, Revenue and Expenses pages, read after mount so the first paint matches the server.
  useEffect(() => setPeriodState(readStoredPeriod()), []);

  function setPeriod(next: PeriodKey) {
    setPeriodState(next);
    writeStoredPeriod(next);
  }

  async function finishConnect(publicToken: string | null, institutionName: string | undefined) {
    writeStoredToken(null);
    setLinkToken(null);
    setRedirectUri(undefined);
    if (!publicToken) return;
    setBusy("connect");
    const { ok, data } = await request("/api/bank/exchange", "POST", { publicToken, institutionName });
    setBusy(null);
    if (!ok) return setNotice({ kind: "error", text: data.error ?? "Couldn't finish connecting" });
    setNotice({
      kind: "ok",
      text: `Connected ${data.institutionName}. Choose which of its ${data.accounts} accounts to use below, then press Save accounts to start importing.`,
    });
    router.replace("/bank");
    router.refresh();
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: redirectUri,
    onSuccess: (publicToken, metadata) => void finishConnect(publicToken, metadata.institution?.name),
    onExit: () => {
      writeStoredToken(null);
      setLinkToken(null);
      setRedirectUri(undefined);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  // Banks that sign you in on their own site send you back here; pick Plaid Link up where it left off.
  useEffect(() => {
    if (!configured || !window.location.search.includes("oauth_state_id")) return;
    const stored = readStoredToken();
    if (stored) {
      setRedirectUri(window.location.href);
      setLinkToken(stored);
    }
  }, [configured]);

  async function sync(silent = false) {
    setBusy("sync");
    const { ok, data } = await request("/api/bank/sync", "POST", {});
    setBusy(null);
    if (!ok) return silent ? undefined : setNotice({ kind: "error", text: data.error ?? "Sync failed" });
    const failed: { institutionName: string; error?: string }[] = (data.results ?? []).filter((r: { error?: string }) => r.error);
    if (failed.length > 0) {
      setNotice({ kind: "error", text: failed.map((f) => `${f.institutionName}: ${f.error}`).join(" · ") });
    } else if (!silent || data.added > 0) {
      setNotice({ kind: "ok", text: data.added > 0 ? `Pulled in ${data.added} new transactions.` : "You're up to date." });
    }
    router.refresh();
  }

  // Opening the page keeps it current without a click when the last sync is a few hours old.
  useEffect(() => {
    if (configured && stale && items.length > 0 && !autoSynced.current) {
      autoSynced.current = true;
      void sync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, stale, items.length]);

  async function connect() {
    setNotice(null);
    setBusy("link");
    const { ok, data } = await request("/api/bank/link-token", "POST");
    setBusy(null);
    if (!ok) return setNotice({ kind: "error", text: data.error ?? "Couldn't start the bank connection" });
    writeStoredToken(data.linkToken);
    setLinkToken(data.linkToken);
  }

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const { ok, data } = await request(`/api/bank/transactions/${id}`, "POST", body);
    setBusy(null);
    if (!ok) setNotice({ kind: "error", text: data.error ?? "That didn't work" });
    else setNotice(null);
    router.refresh();
  }

  async function bulk(action: "apply-suggested" | "ignore", ids: string[]) {
    setBusy("bulk");
    const { ok, data } = await request("/api/bank/transactions/bulk", "POST", { action, ids });
    setBusy(null);
    if (!ok) return setNotice({ kind: "error", text: data.error ?? "That didn't work" });
    const parts = [
      data.added ? `${data.added} added` : null,
      data.ignored ? `${data.ignored} ignored` : null,
      data.skipped ? `${data.skipped} left for you` : null,
    ].filter(Boolean);
    setNotice({ kind: "ok", text: parts.length > 0 ? parts.join(" · ") : "Nothing to do." });
    router.refresh();
  }

  async function disconnect(item: BankItemRow) {
    if (!window.confirm(`Disconnect ${item.institutionName}? Transactions you haven't reviewed yet are removed. Expenses and revenue you've already added stay.`)) return;
    setBusy(item.id);
    const { ok, data } = await request(`/api/bank/items/${item.id}`, "DELETE");
    setBusy(null);
    if (!ok) setNotice({ kind: "error", text: data.error ?? "Couldn't disconnect" });
    router.refresh();
  }

  async function saveAccounts(item: BankItemRow, accountIds: string[]) {
    setBusy(`accounts-${item.id}`);
    const saved = await request(`/api/bank/items/${item.id}/accounts`, "PUT", { accountIds });
    if (!saved.ok) {
      setBusy(null);
      return setNotice({ kind: "error", text: saved.data.error ?? "Couldn't save the accounts" });
    }
    if (accountIds.length === 0) {
      setBusy(null);
      setNotice({ kind: "ok", text: "No accounts selected, so nothing will be imported from this login." });
      return router.refresh();
    }
    const sync = await request("/api/bank/sync", "POST", { itemId: item.id });
    setBusy(null);
    const failed = (sync.data.results ?? []).find((r: { error?: string }) => r.error);
    if (!sync.ok || failed) return setNotice({ kind: "error", text: failed?.error ?? sync.data.error ?? "Saved, but the sync didn't finish" });
    setNotice({
      kind: "ok",
      text: sync.data.added > 0 ? `Saved. Pulled in ${sync.data.added} transactions from the selected accounts.` : "Saved. Nothing new yet; press Sync now in a minute.",
    });
    router.refresh();
  }

  async function deleteRule(id: string) {
    await request(`/api/bank/rules/${id}`, "DELETE");
    router.refresh();
  }

  if (!configured) return <SetupPanel />;

  // Only the chosen period is listed, and "Apply to N" only touches what's on screen.
  const now = new Date();
  const visible = rows.filter((r) => inPeriod(r.date, period, now));
  const periodPhrase = PERIODS.find((p) => p.key === period)!.phrase;
  const hiddenByPeriod = counts[tab].ALL - counts[tab][period];

  const bulkIds = tab === "review" ? visible.filter((r) => r.suggestion && isBulkSafe(r.suggestion)).map((r) => r.id) : [];
  const TABS: { key: BankTab; label: string }[] = [
    { key: "review", label: "To review" },
    { key: "added", label: "Added" },
    { key: "ignored", label: "Ignored" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={connect} disabled={busy != null} className="btn-gold disabled:opacity-50">
          {busy === "link" || busy === "connect" ? "Connecting…" : items.length === 0 ? "+ Connect a bank or card" : "+ Connect another"}
        </button>
        {items.length > 0 && (
          <button onClick={() => sync()} disabled={busy != null} className="btn-ghost disabled:opacity-50">
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>

      {notice && (
        <p
          role="status"
          className={clsx(
            "rounded-[14px] px-4 py-3 text-sm",
            notice.kind === "ok" ? "bg-ok/[.12] text-ok-text" : "bg-bad/[.12] text-bad-text"
          )}
        >
          {notice.text}
        </p>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-base font-bold text-fg">Nothing connected yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Connect a bank account or credit card. Your login goes straight to Plaid, never to this app, and you pick which accounts to share.
          </p>
        </div>
      ) : (
        <>
          <AccountsCard items={items} busy={busy} onSave={saveAccounts} onDisconnect={disconnect} />

          <div className="seg">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className={clsx("seg-tab", period === p.key && "seg-tab-on")}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="seg">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "review" ? "/bank" : `/bank?tab=${t.key}`}
                className={clsx("seg-tab", tab === t.key && "seg-tab-on")}
              >
                {t.label} ({counts[t.key][period]})
              </Link>
            ))}
          </div>

          {bulkIds.length > 0 && (
            <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm text-fg">
                {bulkIds.length} {bulkIds.length === 1 ? "transaction matches" : "transactions match"} one of your saved rules or look like transfers.
              </p>
              <button onClick={() => bulk("apply-suggested", bulkIds)} disabled={busy != null} className="btn-gold btn-sm disabled:opacity-50">
                {busy === "bulk" ? "Working…" : `Apply to ${bulkIds.length}`}
              </button>
            </div>
          )}

          <div className="card">
            {visible.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                {tab === "review"
                  ? !items.some((i) => i.accounts.some((a) => a.tracked))
                    ? "Choose the accounts to use above to start importing."
                    : counts.review.ALL === 0 && counts.added.ALL + counts.ignored.ALL === 0
                    ? "No transactions yet. Press Sync now; a new connection can take a minute to fill in."
                    : `You're all caught up for ${periodPhrase}.`
                  : tab === "added"
                    ? `Nothing added from the bank ${periodPhrase}.`
                    : `Nothing ignored ${periodPhrase}.`}
                {hiddenByPeriod > 0 && ` ${hiddenByPeriod} more in other periods: switch the period above to see them.`}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((row) =>
                  tab === "review" ? (
                    <ReviewRow key={row.id} row={row} busy={busy === row.id || busy === "bulk"} onAct={act} />
                  ) : (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="break-words text-sm text-fg">{row.merchantName || row.name}</p>
                        <p className="text-xs text-muted">
                          {formatDate(row.date)} · {row.account}
                          {row.category && ` · ${row.category}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={clsx("tabular-nums text-sm", row.amount > 0 ? "text-ok-text" : "text-fg")}>{formatMoney(row.amount)}</span>
                        {tab === "added" && row.linkedTo && (
                          <Link href={row.linkedTo === "expense" ? "/expenses" : "/revenue"} className="text-xs font-semibold text-gold-text hover:underline">
                            View in {row.linkedTo === "expense" ? "Expenses" : "Revenue"}
                          </Link>
                        )}
                        {tab === "ignored" && (
                          <button
                            onClick={() => act(row.id, { action: "restore" })}
                            disabled={busy === row.id}
                            className="text-xs font-semibold text-gold-text hover:underline disabled:opacity-50"
                          >
                            Move back to review
                          </button>
                        )}
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
          {truncated && visible.length === rows.length && <p className="text-center text-xs text-muted">Showing the newest {rows.length}. Work through these and the rest will follow.</p>}

          {rules.length > 0 && (
            <details className="card px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-fg">Saved rules ({rules.length})</summary>
              <ul className="mt-3 divide-y divide-line">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words text-fg">
                      <span className="capitalize">{r.merchantKey}</span>
                      <span className="text-muted">
                        {" "}
                        ({r.direction === "IN" ? "money in" : "money out"}) → {r.action === "IGNORE" ? "ignore" : r.category}
                      </span>
                    </span>
                    <button onClick={() => deleteRule(r.id)} className="text-xs font-semibold text-bad-text hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
