import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Source credentials are stored encrypted (AES-256-GCM).
 *
 * The key comes from SOURCES_ENCRYPTION_KEY. Without it a random key is
 * generated once into .data/secret.key, which is convenient for development
 * but keeps the key next to the data: set the env variable in production.
 */
const KEY_FILE = path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "secret.key");

let cached: Buffer | undefined;

function key(): Buffer {
  if (cached) return cached;
  const env = process.env.SOURCES_ENCRYPTION_KEY;
  if (env) return (cached = createHash("sha256").update(env).digest());
  try {
    cached = Buffer.from(fs.readFileSync(KEY_FILE, "utf8").trim(), "hex");
  } catch {
    cached = randomBytes(32);
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(KEY_FILE, cached.toString("hex"), { mode: 0o600 });
  }
  return cached;
}

export function seal(credentials: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** Throws when the blob was sealed with a different key. */
export function open(secret: string): Record<string, string> {
  if (!secret) return {};
  const [version, iv, tag, body] = secret.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Stored credentials are unreadable. Enter them again.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const text = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
    return JSON.parse(text);
  } catch {
    throw new Error("Stored credentials cannot be decrypted (the encryption key changed). Enter them again.");
  }
}
