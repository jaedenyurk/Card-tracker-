import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Plaid access tokens let anyone holding them read the linked account's
// transactions, so they're stored encrypted (AES-256-GCM) and only decrypted
// in memory at sync time. The key lives in the PLAID_TOKEN_KEY env var, never
// in the database: a leaked database dump alone can't be used against the bank.
//
// Stored format: v1:<iv>:<auth tag>:<ciphertext>, each part base64.

const VERSION = "v1";

function keyFromEnv(): Buffer {
  const raw = process.env.PLAID_TOKEN_KEY;
  if (!raw) throw new Error("PLAID_TOKEN_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PLAID_TOKEN_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32)");
  return key;
}

export function encryptToken(plain: string, key: Buffer = keyFromEnv()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(stored: string, key: Buffer = keyFromEnv()): string {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Unrecognized stored token format");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
