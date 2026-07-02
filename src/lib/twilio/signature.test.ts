import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateTwilioSignature } from "./signature";

const AUTH_TOKEN = "test-auth-token-xyz";
const URL = "https://sift.example.com/api/webhooks/twilio";
const PARAMS: Record<string, string> = {
  Body: "12.50 coffee",
  From: "whatsapp:+15551234567",
  To: "whatsapp:+14155238886",
};

/**
 * Independent inline implementation of Twilio's signature algorithm, kept
 * deliberately separate from `src/lib/twilio/signature.ts` so the test can't
 * pass merely because both sides share a bug: concatenate the URL with each
 * POST param appended as `name+value` (params sorted alphabetically by
 * name, no separators), HMAC-SHA1 with the auth token, base64-encode.
 */
function computeExpectedSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const sortedNames = Object.keys(params).sort();
  let data = url;
  for (const name of sortedNames) {
    data += name + params[name];
  }
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

describe("validateTwilioSignature", () => {
  it("returns true for a correctly computed signature", () => {
    const signature = computeExpectedSignature(AUTH_TOKEN, URL, PARAMS);
    expect(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, signature)).toBe(true);
  });

  it("returns false when a param value is changed after signing", () => {
    const signature = computeExpectedSignature(AUTH_TOKEN, URL, PARAMS);
    const tampered = { ...PARAMS, Body: "999.99 coffee" };
    expect(validateTwilioSignature(AUTH_TOKEN, URL, tampered, signature)).toBe(false);
  });

  it("returns false for an empty signature", () => {
    expect(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, "")).toBe(false);
  });

  it("returns false (never throws) when the signature length differs from the expected digest", () => {
    const signature = computeExpectedSignature(AUTH_TOKEN, URL, PARAMS);
    const wrongLength = signature + "extra-bytes";
    expect(() =>
      validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, wrongLength),
    ).not.toThrow();
    expect(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, wrongLength)).toBe(false);
  });

  it("returns false for a wrong auth token", () => {
    const signature = computeExpectedSignature(AUTH_TOKEN, URL, PARAMS);
    expect(validateTwilioSignature("a-different-token", URL, PARAMS, signature)).toBe(
      false,
    );
  });
});
