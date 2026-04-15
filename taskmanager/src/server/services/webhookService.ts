import crypto from "crypto";

/**
 * Verify GitHub webhook signature (HMAC-SHA256).
 * GitHub sends the signature in the `X-Hub-Signature-256` header
 * in the format `sha256=<hex-digest>`.
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload, "utf-8");
  const expected = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    // lengths differ — signatures don't match
    return false;
  }
}
