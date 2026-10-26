import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paystackEnabled, validWebhookSignature } from "./paystack.server";

vi.mock("../../db/index.js", () => ({ db: {} }));

afterEach(() => vi.unstubAllEnvs());

describe("Paystack runtime configuration", () => {
  it("reads configuration after the module has loaded", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect(paystackEnabled()).toBe(false);
    vi.stubEnv("PAYSTACK_SECRET_KEY", "test-only");
    expect(paystackEnabled()).toBe(true);
  });

  it("uses the current runtime key to verify webhooks", () => {
    const body = '{"event":"charge.success"}';
    const signature = createHmac("sha512", "test-only")
      .update(body)
      .digest("hex");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "test-only");
    expect(validWebhookSignature(body, signature)).toBe(true);
    vi.stubEnv("PAYSTACK_SECRET_KEY", "different-test-only");
    expect(validWebhookSignature(body, signature)).toBe(false);
  });

  it("rejects webhooks when payment is not configured", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect(validWebhookSignature("{}", "invalid")).toBe(false);
    expect(validWebhookSignature("{}", null)).toBe(false);
  });
});
