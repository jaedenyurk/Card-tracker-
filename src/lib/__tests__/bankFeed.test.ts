import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  findDuplicate,
  isBulkSafe,
  normalizeMerchantKey,
  plaidTxToInput,
  suggestFor,
  suggestFromPlaid,
  type PlaidTxLike,
  type RuleLike,
} from "../bankFeed";
import { assertTokenKey, decryptToken, encryptToken } from "../plaidCrypto";

function plaidTx(overrides: Partial<PlaidTxLike> = {}): PlaidTxLike {
  return {
    transaction_id: "t1",
    account_id: "a1",
    amount: 12.5,
    date: "2026-10-20",
    name: "STARBUCKS #1234 SEATTLE WA",
    pending: false,
    ...overrides,
  };
}

test("plaidTxToInput flips Plaid's sign: money out is negative cents, money in is positive", () => {
  assert.equal(plaidTxToInput(plaidTx({ amount: 12.5 })).amount, -1250);
  assert.equal(plaidTxToInput(plaidTx({ amount: -300 })).amount, 30000);
  assert.equal(Object.is(plaidTxToInput(plaidTx({ amount: 0 })).amount, 0), true); // never -0
});

test("plaidTxToInput rounds dollars to whole cents without float drift", () => {
  assert.equal(plaidTxToInput(plaidTx({ amount: 19.99 })).amount, -1999);
  assert.equal(plaidTxToInput(plaidTx({ amount: 0.1 + 0.2 })).amount, -30);
});

test("plaidTxToInput prefers the purchase date over the posting date", () => {
  const t = plaidTxToInput(plaidTx({ date: "2026-10-22", authorized_date: "2026-10-20" }));
  assert.equal(t.date.toISOString(), "2026-10-20T00:00:00.000Z");
  assert.equal(plaidTxToInput(plaidTx({ date: "2026-10-22" })).date.toISOString(), "2026-10-22T00:00:00.000Z");
});

test("plaidTxToInput carries the merchant and detailed category through", () => {
  const t = plaidTxToInput(
    plaidTx({ merchant_name: "Starbucks", personal_finance_category: { detailed: "FOOD_AND_DRINK_COFFEE" } })
  );
  assert.equal(t.merchantName, "Starbucks");
  assert.equal(t.plaidCategory, "FOOD_AND_DRINK_COFFEE");
});

test("normalizeMerchantKey drops store numbers and punctuation so one rule covers every charge", () => {
  // Same store, different store numbers: the numbers don't change the key.
  assert.equal(normalizeMerchantKey("STARBUCKS #1234 SEATTLE WA"), "starbucks seattle");
  assert.equal(normalizeMerchantKey("STARBUCKS #88 SEATTLE WA"), "starbucks seattle");
  assert.equal(normalizeMerchantKey("TST* BLUE BOTTLE 4521"), "tst blue");
});

test("normalizeMerchantKey uses Plaid's clean merchant name whole when there is one", () => {
  assert.equal(normalizeMerchantKey("SQ *JOES GRADING 88", "Joe's Grading Co"), "joe grading co");
  assert.equal(normalizeMerchantKey("STARBUCKS #1234 SEATTLE WA", "Starbucks"), "starbucks");
});

test("normalizeMerchantKey is empty when nothing usable is left", () => {
  assert.equal(normalizeMerchantKey("1234 5678"), "");
});

test("suggestFromPlaid sends transfers and card payments to Ignore, in either direction", () => {
  for (const d of ["IN", "OUT"] as const) {
    assert.deepEqual(suggestFromPlaid("TRANSFER_OUT_ACCOUNT_TRANSFER", d), { action: "IGNORE", source: "plaid" });
    assert.deepEqual(suggestFromPlaid("LOAN_PAYMENTS_CREDIT_CARD_PAYMENT", d), { action: "IGNORE", source: "plaid" });
  }
});

test("suggestFromPlaid pre-fills an expense category for shipping and marketplaces, never for deposits", () => {
  assert.deepEqual(suggestFromPlaid("GENERAL_SERVICES_POSTAGE_AND_SHIPPING", "OUT"), {
    action: "ADD",
    category: "Shipping",
    source: "plaid",
  });
  assert.equal(suggestFromPlaid("GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", "OUT")?.category, "Inventory");
  assert.equal(suggestFromPlaid("GENERAL_SERVICES_POSTAGE_AND_SHIPPING", "IN"), null);
});

test("suggestFromPlaid has no opinion on categories it doesn't know", () => {
  assert.equal(suggestFromPlaid("FOOD_AND_DRINK_COFFEE", "OUT"), null);
  assert.equal(suggestFromPlaid(null, "OUT"), null);
});

const rules: RuleLike[] = [
  { merchantKey: "starbucks", direction: "OUT", action: "ADD", category: "Travel" },
  { merchantKey: "venmo", direction: "IN", action: "IGNORE", category: null },
];

test("suggestFor: a saved rule wins over Plaid's guess", () => {
  const tx = { name: "STARBUCKS #1234", merchantName: "Starbucks", amount: -450, plaidCategory: "TRAVEL_FLIGHTS" };
  assert.deepEqual(suggestFor(tx, rules), { action: "ADD", category: "Travel", source: "rule" });
});

test("suggestFor: a rule only applies to its own direction", () => {
  const refund = { name: "STARBUCKS", merchantName: "Starbucks", amount: 450, plaidCategory: null };
  assert.equal(suggestFor(refund, rules), null);
  const venmoIn = { name: "VENMO CASHOUT", merchantName: "Venmo", amount: 5000, plaidCategory: null };
  assert.deepEqual(suggestFor(venmoIn, rules), { action: "IGNORE", source: "rule" });
});

test("suggestFor falls back to Plaid, then to nothing", () => {
  const tx = { name: "USPS", merchantName: null, amount: -800, plaidCategory: "GENERAL_SERVICES_POSTAGE_AND_SHIPPING" };
  assert.equal(suggestFor(tx, rules)?.source, "plaid");
  assert.equal(suggestFor({ name: "Mystery", merchantName: null, amount: -100, plaidCategory: null }, rules), null);
});

test("bulk apply is limited to the user's own rules and transfers, never Plaid's category guesses", () => {
  assert.equal(isBulkSafe({ action: "ADD", category: "Travel", source: "rule" }), true);
  assert.equal(isBulkSafe({ action: "IGNORE", source: "plaid" }), true);
  assert.equal(isBulkSafe({ action: "ADD", category: "Inventory", source: "plaid" }), false);
});

const entry = (id: string, date: string, amount: number) => ({ id, date, amount, description: id });

test("findDuplicate matches the same amount within three days, ignoring the sign", () => {
  const tx = { date: "2026-10-20", amount: -1250 };
  assert.equal(findDuplicate(tx, [entry("e1", "2026-10-22", 1250)])?.id, "e1");
  assert.equal(findDuplicate(tx, [entry("e1", "2026-10-24", 1250)]), null); // 4 days apart
  assert.equal(findDuplicate(tx, [entry("e1", "2026-10-20", 1251)]), null); // a cent off
});

test("findDuplicate picks the closest date, and skips entries already claimed", () => {
  const tx = { date: "2026-10-20", amount: -500 };
  const entries = [entry("far", "2026-10-23", 500), entry("near", "2026-10-21", 500)];
  assert.equal(findDuplicate(tx, entries)?.id, "near");
  assert.equal(findDuplicate(tx, entries, new Set(["near"]))?.id, "far");
  assert.equal(findDuplicate(tx, entries, new Set(["near", "far"])), null);
});

test("token encryption round-trips and never stores the plain token", () => {
  const key = randomBytes(32);
  const stored = encryptToken("access-production-abc123", key);
  assert.equal(stored.includes("abc123"), false);
  assert.match(stored, /^v1:/);
  assert.equal(decryptToken(stored, key), "access-production-abc123");
});

test("token encryption uses a fresh IV each time", () => {
  const key = randomBytes(32);
  assert.notEqual(encryptToken("same", key), encryptToken("same", key));
});

test("a token can't be decrypted with the wrong key or after tampering", () => {
  const key = randomBytes(32);
  const stored = encryptToken("secret-token", key);
  assert.throws(() => decryptToken(stored, randomBytes(32)));
  const parts = stored.split(":");
  parts[3] = Buffer.from("tampered-bytes!").toString("base64");
  assert.throws(() => decryptToken(parts.join(":"), key));
  assert.throws(() => decryptToken("not-a-token", key));
});

test("assertTokenKey accepts a 32-byte base64 key and rejects anything else without printing it", () => {
  const before = process.env.PLAID_TOKEN_KEY;
  try {
    process.env.PLAID_TOKEN_KEY = randomBytes(32).toString("base64");
    assert.doesNotThrow(() => assertTokenKey());

    const bad = "access-production-0123456789abcdef";
    process.env.PLAID_TOKEN_KEY = bad;
    assert.throws(() => assertTokenKey(), (e: Error) => /32 bytes/.test(e.message) && !e.message.includes(bad));

    delete process.env.PLAID_TOKEN_KEY;
    assert.throws(() => assertTokenKey(), /not set/);
  } finally {
    if (before === undefined) delete process.env.PLAID_TOKEN_KEY;
    else process.env.PLAID_TOKEN_KEY = before;
  }
});
