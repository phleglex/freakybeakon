import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { CURRENCY } from "@/lib/menu";

// Server-only Paystack helpers. The secret key never leaves the server.
const API = "https://api.paystack.co";

declare const Netlify: {
  env: { get(name: string): string | undefined };
};

function runtimeSecretKey() {
  // Netlify provides this at invocation time, without embedding secrets in the bundle.
  return typeof Netlify === "undefined"
    ? undefined
    : Netlify.env.get("PAYSTACK_SECRET_KEY") ||
        Netlify.env.get("PAYSTACK_PRIVATE_KEY");
}

export function paystackEnabled() {
  return Boolean(runtimeSecretKey());
}

function secretKey() {
  const key = runtimeSecretKey();
  if (!key) throw new Error("Online payment is not configured");
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
  });
  const body = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: T;
  } | null;
  if (!res.ok || !body?.status || !body.data) {
    throw new Error(`Paystack request failed: ${body?.message ?? res.status}`);
  }
  return body.data;
}

export async function initializeTransaction(opts: {
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  orderCode: string;
}) {
  const data = await paystackFetch<{ authorization_url: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: opts.email,
        // Paystack expects the amount in the currency's subunit (pesewas).
        amount: opts.amountCents,
        currency: CURRENCY,
        reference: opts.reference,
        callback_url: opts.callbackUrl,
        metadata: { order_code: opts.orderCode },
      }),
    },
  );
  return data.authorization_url;
}

type Transaction = {
  status: string;
  amount: number;
  currency: string;
  reference: string;
  paid_at?: string | null;
};

/**
 * Checks a transaction with Paystack and records the result on the matching order.
 * Only marks an order paid when the amount and currency match what we charged.
 */
export async function syncPayment(reference: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentReference, reference))
    .limit(1);
  if (!order || order.paymentStatus === "paid")
    return order?.paymentStatus ?? null;

  const tx = await paystackFetch<Transaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  let paymentStatus: "paid" | "failed" | "pending" = "pending";
  if (
    tx.status === "success" &&
    tx.amount === order.totalCents &&
    tx.currency === CURRENCY
  )
    paymentStatus = "paid";
  // 'abandoned' just means checkout was opened but not finished, so the customer can still pay.
  else if (tx.status === "failed" || tx.status === "success")
    paymentStatus = "failed";

  if (paymentStatus !== "pending") {
    await db
      .update(orders)
      .set({
        paymentStatus,
        paidAt:
          paymentStatus === "paid" ? new Date(tx.paid_at ?? Date.now()) : null,
      })
      .where(and(eq(orders.id, order.id), ne(orders.paymentStatus, "paid")));
  }
  return paymentStatus;
}

/** Validates the x-paystack-signature header (HMAC SHA512 of the raw body). */
export function validWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  if (!signature || !paystackEnabled()) return false;
  const expected = createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
