import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { decryptToken } from "./plaidCrypto";
import { plaidTxToInput, type PlaidTxLike } from "./bankFeed";

/** Everything the bank feed needs to talk to Plaid is set. The /bank page shows a setup panel until it is. */
export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET && process.env.PLAID_TOKEN_KEY);
}

export function plaidEnvName(): "sandbox" | "production" {
  const env = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  if (env !== "sandbox" && env !== "production") {
    // Never echo the value back: a mis-pasted secret would end up on screen.
    throw new Error('PLAID_ENV must be exactly "sandbox" or "production"');
  }
  return env;
}

let client: PlaidApi | null = null;

export function getPlaid(): PlaidApi {
  if (!plaidConfigured()) throw new Error("Plaid isn't set up yet: add PLAID_CLIENT_ID, PLAID_SECRET and PLAID_TOKEN_KEY");
  client ??= new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[plaidEnvName()],
      baseOptions: {
        headers: { "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!, "PLAID-SECRET": process.env.PLAID_SECRET! },
      },
    })
  );
  return client;
}

// Plaid errors arrive as axios errors with the useful part in response.data.
type PlaidErrorLike = { response?: { data?: { error_code?: string; error_message?: string } }; message?: string };

export function plaidErrorCode(e: unknown): string | undefined {
  return (e as PlaidErrorLike)?.response?.data?.error_code;
}

export function plaidErrorMessage(e: unknown): string {
  const code = plaidErrorCode(e);
  if (code === "ITEM_LOGIN_REQUIRED") return "Your bank needs you to sign in again. Disconnect it and connect it again.";
  return (e as PlaidErrorLike)?.response?.data?.error_message ?? (e as PlaidErrorLike)?.message ?? "Plaid request failed";
}

interface SyncPage {
  added: PlaidTxLike[];
  modified: PlaidTxLike[];
  removed: { transaction_id: string }[];
  accounts: { account_id: string; name: string; mask?: string | null; type: string }[];
  next_cursor: string;
  has_more: boolean;
}

/** The one Plaid call syncing needs, so tests can stand in for it. */
export interface SyncClient {
  transactionsSync(request: {
    access_token: string;
    cursor?: string;
    count: number;
    options: { include_personal_finance_category: boolean };
  }): Promise<{ data: SyncPage }>;
}

async function pullSyncBatch(plaid: SyncClient, accessToken: string, startCursor: string | null) {
  // Plaid asks for the whole paging loop to restart from the first cursor if the
  // data changes under it mid-way, rather than retrying only the failed page.
  for (let attempt = 0; ; attempt++) {
    try {
      const batch = {
        added: [] as PlaidTxLike[],
        modified: [] as PlaidTxLike[],
        removed: [] as { transaction_id: string }[],
        accounts: new Map<string, SyncPage["accounts"][number]>(),
        nextCursor: startCursor ?? "",
      };
      let cursor = startCursor || undefined;
      let hasMore = true;
      while (hasMore) {
        const { data } = await plaid.transactionsSync({
          access_token: accessToken,
          cursor,
          count: 500,
          options: { include_personal_finance_category: true },
        });
        batch.added.push(...data.added);
        batch.modified.push(...data.modified);
        batch.removed.push(...data.removed);
        for (const a of data.accounts) batch.accounts.set(a.account_id, a);
        cursor = data.next_cursor || undefined;
        batch.nextCursor = data.next_cursor;
        hasMore = data.has_more;
      }
      return batch;
    } catch (e) {
      if (attempt < 2 && plaidErrorCode(e) === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") continue;
      throw e;
    }
  }
}

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

const CHUNK = 500; // keeps createMany well under Postgres's bind-parameter limit

/**
 * Pulls everything new for one connected login and files it in the review inbox.
 *
 * - Pending charges are skipped: they come back as a new posted transaction in a
 *   day or two, and importing both would show the same purchase twice.
 * - Re-running is safe: inserts skip rows that exist, updates only touch rows
 *   still waiting for review, and the cursor is saved last, so a sync that dies
 *   half-way simply redoes the same work next time.
 * - Anything already added or ignored is left alone when Plaid later changes it.
 */
export async function syncItem(
  item: { id: string; accessToken: string; cursor: string | null },
  deps: { plaid?: SyncClient; db?: PrismaClient; decrypt?: (stored: string) => string } = {}
): Promise<SyncResult> {
  const db = deps.db ?? prisma;
  try {
    const plaid = deps.plaid ?? (getPlaid() as unknown as SyncClient);
    const batch = await pullSyncBatch(plaid, (deps.decrypt ?? decryptToken)(item.accessToken), item.cursor);

    for (const a of batch.accounts.values()) {
      const fields = { name: a.name, mask: a.mask ?? null, type: String(a.type) };
      await db.bankAccount.upsert({
        where: { plaidAccountId: a.account_id },
        create: { plaidAccountId: a.account_id, itemId: item.id, ...fields },
        update: fields,
      });
    }
    const accounts = await db.bankAccount.findMany({
      where: { itemId: item.id },
      select: { id: true, plaidAccountId: true },
    });
    const accountIdByPlaid = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));

    const posted = (list: PlaidTxLike[]) =>
      list.filter((t) => !t.pending && accountIdByPlaid.has(t.account_id)).map(plaidTxToInput);
    const added = posted(batch.added);
    const modified = posted(batch.modified);

    const rows = [...added, ...modified].map(({ pending: _pending, plaidAccountId, ...rest }) => ({
      ...rest,
      accountId: accountIdByPlaid.get(plaidAccountId)!,
    }));
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.bankTransaction.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    }

    for (const t of modified) {
      await db.bankTransaction.updateMany({
        where: { plaidTransactionId: t.plaidTransactionId, status: "NEW" },
        data: { date: t.date, name: t.name, merchantName: t.merchantName, amount: t.amount, plaidCategory: t.plaidCategory },
      });
    }

    const removedIds = batch.removed.map((r) => r.transaction_id);
    for (let i = 0; i < removedIds.length; i += CHUNK) {
      await db.bankTransaction.deleteMany({
        where: { plaidTransactionId: { in: removedIds.slice(i, i + CHUNK) }, status: { in: ["NEW", "IGNORED"] } },
      });
    }

    await db.plaidItem.update({
      where: { id: item.id },
      data: { cursor: batch.nextCursor || null, lastSyncedAt: new Date(), syncError: null },
    });
    return { added: added.length, modified: modified.length, removed: removedIds.length };
  } catch (e) {
    const message = plaidErrorMessage(e);
    await db.plaidItem.update({ where: { id: item.id }, data: { syncError: message } }).catch(() => undefined);
    throw new Error(message);
  }
}
