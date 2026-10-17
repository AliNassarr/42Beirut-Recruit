import crypto from "crypto";

export function getBridgeSecret(): string {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.FORTY_TWO_CLIENT_SECRET ||
    "42_beirut_default_secret_fallback";
  return secret.replace(/^["']|["']$/g, "").trim();
}

export function generateBridgeSignature(code: string, ts: string): string {
  const secret = getBridgeSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`${code}.${ts}`)
    .digest("hex");
}

export function verifyBridgeSignature(code: string, ts: string, sig: string): boolean {
  if (!code || !ts || !sig) return false;

  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp)) return false;

  // Maximum age: 5 minutes (300,000 ms), with 60s clock drift tolerance
  const now = Date.now();
  if (now - timestamp > 5 * 60 * 1000 || timestamp - now > 60 * 1000) {
    return false;
  }

  const expected = generateBridgeSignature(code, ts);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "utf-8"), Buffer.from(expected, "utf-8"));
  } catch {
    return sig === expected;
  }
}
