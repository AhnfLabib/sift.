import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validates Twilio's `X-Twilio-Signature` header per Twilio's documented
 * algorithm: concatenate the full request URL with each POST param appended
 * as `name` + `value` (no separators), params sorted alphabetically by name;
 * HMAC-SHA1 the result with the auth token; base64-encode; constant-time
 * compare against the header value.
 *
 * Never throws — a malformed/mismatched-length signature is simply invalid.
 */
export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedNames = Object.keys(params).sort();

  let data = url;
  for (const name of sortedNames) {
    data += name + params[name];
  }

  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  // timingSafeEqual throws on length mismatch — guard it explicitly so an
  // attacker-controlled signature length can never distinguish "wrong
  // length" from "wrong bytes" via an exception vs. a false return.
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
