import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paystackEnabled, validWebhookSignature } from "./paystack.server";

vi.mock("../../db/index.js", () => ({ db: {} }));

let runtimeKey: string | undefined;
beforeEach(() => {
  runtimeKey = undefined;
  vi.stubGlobal("Netlify", {
    env: {
      get: (name: string) =>
        name === "PAYSTACK_SECRET_KEY" ? runtimeKey : undefined,
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Paystack runtime configuration", () => {
  it("reads configuration after the module has loaded", () => {
    runtimeKey = undefined;
    expect(paystackEnabled()).toBe(false);
    runtimeKey = "test-only";
    expect(paystackEnabled()).toBe(true);
  });

  it("uses the current runtime key to verify webhooks", () => {
    const body = '{"event":"charge.success"}';
    const signature = createHmac("sha512", "test-only")
      .update(body)
      .digest("hex");
    runtimeKey = "test-only";
    expect(validWebhookSignature(body, signature)).toBe(true);
    runtimeKey = "different-test-only";
    expect(validWebhookSignature(body, signature)).toBe(false);
  });

  it("rejects webhooks when payment is not configured", () => {
    runtimeKey = undefined;
    expect(validWebhookSignature("{}", "invalid")).toBe(false);
    expect(validWebhookSignature("{}", null)).toBe(false);
  });

  it("disables payments outside the Netlify runtime", () => {
    vi.stubGlobal("Netlify", undefined);
    expect(paystackEnabled()).toBe(false);
  });

  it("supports the existing PAYSTACK_PRIVATE_KEY configuration", () => {
    vi.stubGlobal("Netlify", {
      env: {
        get: (name: string) =>
          name === "PAYSTACK_PRIVATE_KEY" ? "test-only" : undefined,
      },
    });
    expect(paystackEnabled()).toBe(true);
    const signature = createHmac("sha512", "test-only")
      .update("{}")
      .digest("hex");
    expect(validWebhookSignature("{}", signature)).toBe(true);
  });
});
