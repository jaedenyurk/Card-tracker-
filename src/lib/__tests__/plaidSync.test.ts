import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { syncItem, type SyncClient } from "../plaid";
import type { PlaidTxLike } from "../bankFeed";

// A tiny in-memory stand-in for the four Prisma tables the sync touches.
type Row = Record<string, unknown> & { plaidTransactionId: string; status: string };

function fakeDb() {
  const accounts: { id: string; plaidAccountId: string; itemId: string; name: string }[] = [];
  const txs: Row[] = [];
  const item: { cursor: string | null; lastSyncedAt: Date | null; syncError: string | null } = {
    cursor: null,
    lastSyncedAt: null,
    syncError: null,
  };
  const db = {
    bankAccount: {
      upsert: async ({ where, create, update }: any) => {
        const found = accounts.find((a) => a.plaidAccountId === where.plaidAccountId);
        if (found) Object.assign(found, update);
        else accounts.push({ id: `acct_${accounts.length + 1}`, ...create });
      },
      findMany: async ({ where }: any) => accounts.filter((a) => a.itemId === where.itemId),
    },
    bankTransaction: {
      createMany: async ({ data }: any) => {
        for (const d of data) {
          if (!txs.some((t) => t.plaidTransactionId === d.plaidTransactionId)) txs.push({ status: "NEW", ...d });
        }
      },
      updateMany: async ({ where, data }: any) => {
        for (const t of txs) if (t.plaidTransactionId === where.plaidTransactionId && t.status === where.status) Object.assign(t, data);
      },
      deleteMany: async ({ where }: any) => {
        const ids: string[] = where.plaidTransactionId.in;
        const statuses: string[] = where.status.in;
        for (let i = txs.length - 1; i >= 0; i--) if (ids.includes(txs[i].plaidTransactionId) && statuses.includes(txs[i].status)) txs.splice(i, 1);
      },
    },
    plaidItem: { update: async ({ data }: any) => void Object.assign(item, data) },
  } as unknown as PrismaClient;
  return { db, accounts, txs, item };
}

const tx = (id: string, overrides: Partial<PlaidTxLike> = {}): PlaidTxLike => ({
  transaction_id: id,
  account_id: "plaid_acct",
  amount: 10,
  date: "2026-10-20",
  name: `Merchant ${id}`,
  pending: false,
  ...overrides,
});

const account = { account_id: "plaid_acct", name: "Business Checking", mask: "1234", type: "depository" };

type Page = Partial<{ added: PlaidTxLike[]; modified: PlaidTxLike[]; removed: { transaction_id: string }[]; next_cursor: string; has_more: boolean }>;

function scriptedPlaid(pages: (Page | Error)[]) {
  const requests: (string | undefined)[] = [];
  let i = 0;
  const plaid: SyncClient = {
    transactionsSync: async (req) => {
      requests.push(req.cursor);
      const page = pages[i++];
      if (page instanceof Error) throw page;
      return { data: { added: [], modified: [], removed: [], accounts: [account], next_cursor: "", has_more: false, ...page } };
    },
  };
  return { plaid, requests };
}

const deps = (db: PrismaClient, plaid: SyncClient) => ({ db, plaid, decrypt: (s: string) => `plain:${s}` });
const item = { id: "item1", accessToken: "enc", cursor: null as string | null };

test("sync follows every page, stores the accounts, and saves the final cursor", async () => {
  const { db, accounts, txs, item: row } = fakeDb();
  const { plaid, requests } = scriptedPlaid([
    { added: [tx("a"), tx("b")], next_cursor: "c1", has_more: true },
    { added: [tx("c")], next_cursor: "c2", has_more: false },
  ]);
  const result = await syncItem(item, deps(db, plaid));
  assert.deepEqual(requests, [undefined, "c1"]);
  assert.deepEqual(result, { added: 3, modified: 0, removed: 0 });
  assert.equal(txs.length, 3);
  assert.equal(accounts.length, 1);
  assert.equal(row.cursor, "c2");
  assert.ok(row.lastSyncedAt);
  assert.equal(row.syncError, null);
});

test("sync stores money out as negative cents against the right account", async () => {
  const { db, txs } = fakeDb();
  const { plaid } = scriptedPlaid([{ added: [tx("a", { amount: 12.34 }), tx("b", { amount: -50 })], next_cursor: "c" }]);
  await syncItem(item, deps(db, plaid));
  assert.equal(txs.find((t) => t.plaidTransactionId === "a")?.amount, -1234);
  assert.equal(txs.find((t) => t.plaidTransactionId === "b")?.amount, 5000);
  assert.equal(txs[0].accountId, "acct_1");
});

test("sync skips pending charges so a purchase isn't imported twice", async () => {
  const { db, txs } = fakeDb();
  const { plaid } = scriptedPlaid([{ added: [tx("posted"), tx("pending", { pending: true })], next_cursor: "c" }]);
  const result = await syncItem(item, deps(db, plaid));
  assert.deepEqual(txs.map((t) => t.plaidTransactionId), ["posted"]);
  assert.equal(result.added, 1);
});

test("running the same sync again doesn't create duplicates", async () => {
  const { db, txs } = fakeDb();
  const page = { added: [tx("a"), tx("b")], next_cursor: "c" };
  await syncItem(item, deps(db, scriptedPlaid([page]).plaid));
  await syncItem(item, deps(db, scriptedPlaid([page]).plaid));
  assert.equal(txs.length, 2);
});

test("a modified transaction updates while it's waiting for review, but not once it's been added", async () => {
  const { db, txs } = fakeDb();
  await syncItem(item, deps(db, scriptedPlaid([{ added: [tx("a"), tx("b")], next_cursor: "c1" }]).plaid));
  txs.find((t) => t.plaidTransactionId === "b")!.status = "ADDED";
  await syncItem(
    { ...item, cursor: "c1" },
    deps(db, scriptedPlaid([{ modified: [tx("a", { amount: 99 }), tx("b", { amount: 99 })], next_cursor: "c2" }]).plaid)
  );
  assert.equal(txs.find((t) => t.plaidTransactionId === "a")?.amount, -9900);
  assert.equal(txs.find((t) => t.plaidTransactionId === "b")?.amount, -1000); // untouched
});

test("a removed transaction is dropped unless it was already added", async () => {
  const { db, txs } = fakeDb();
  await syncItem(item, deps(db, scriptedPlaid([{ added: [tx("a"), tx("b"), tx("c")], next_cursor: "c1" }]).plaid));
  txs.find((t) => t.plaidTransactionId === "b")!.status = "ADDED";
  txs.find((t) => t.plaidTransactionId === "c")!.status = "IGNORED";
  const result = await syncItem(
    { ...item, cursor: "c1" },
    deps(db, scriptedPlaid([{ removed: [{ transaction_id: "a" }, { transaction_id: "b" }, { transaction_id: "c" }], next_cursor: "c2" }]).plaid)
  );
  assert.deepEqual(txs.map((t) => t.plaidTransactionId), ["b"]);
  assert.equal(result.removed, 3);
});

test("if the data changes mid-paging, the whole loop restarts from the first cursor", async () => {
  const { db, txs } = fakeDb();
  const mutation = Object.assign(new Error("mutation"), {
    response: { data: { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" } },
  });
  const { plaid, requests } = scriptedPlaid([
    { added: [tx("a")], next_cursor: "p1", has_more: true },
    mutation,
    { added: [tx("a"), tx("b")], next_cursor: "done" },
  ]);
  const result = await syncItem({ ...item, cursor: "start" }, deps(db, plaid));
  assert.deepEqual(requests, ["start", "p1", "start"]);
  assert.equal(txs.length, 2);
  assert.equal(result.added, 2);
});

test("a failed sync records the error on the item, keeps the old cursor, and throws a readable message", async () => {
  const { db, item: row } = fakeDb();
  row.cursor = "keep";
  const boom = Object.assign(new Error("axios"), { response: { data: { error_code: "ITEM_LOGIN_REQUIRED" } } });
  const { plaid } = scriptedPlaid([boom]);
  await assert.rejects(syncItem({ ...item, cursor: "keep" }, deps(db, plaid)), /sign in again/);
  assert.match(row.syncError ?? "", /sign in again/);
  assert.equal(row.cursor, "keep");
});

test("an empty first sync (Plaid hasn't finished) saves no cursor so the next sync starts fresh", async () => {
  const { db, item: row } = fakeDb();
  await syncItem(item, deps(db, scriptedPlaid([{ next_cursor: "" }]).plaid));
  assert.equal(row.cursor, null);
});
