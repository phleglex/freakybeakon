import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { orders, type OrderLine } from '../../db/schema.js'
import { calculateTotals, DELIVERY_MINIMUM_CENTS, menuById } from '@/lib/menu'
import { quoteDelivery } from '@/lib/delivery.server'
import { initializeTransaction, paystackEnabled, syncPayment } from '@/lib/paystack.server'

const placeOrderInput = z
  .object({
    customerName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(25),
    email: z.union([z.email().max(120), z.literal('')]).optional(),
    fulfillment: z.enum(['pickup', 'delivery']),
    address: z.string().trim().max(500).optional(),
    deliveryPlaceId: z.string().min(1).max(300).optional(),
    notes: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(['in_person', 'paystack']).default('in_person'),
    items: z
      .array(
        z.object({
          itemId: z.string().max(50),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine((o) => o.fulfillment === 'pickup' || (o.address && o.address.length >= 5), {
    message: 'A delivery address is required',
    path: ['address'],
  })
  .refine((o) => o.paymentMethod === 'in_person' || o.email, {
    message: 'An email is required to pay online',
    path: ['email'],
  })

export type PlaceOrderInput = z.infer<typeof placeOrderInput>

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

// Paystack references must be unique per attempt, so retries get a fresh suffix.
function makeReference(code: string) {
  return `FB-${code}-${Date.now().toString(36).toUpperCase()}`
}

function callbackUrl(code: string) {
  return `${new URL(getRequest().url).origin}/order/${code}`
}

export const getPaymentOptions = createServerFn({ method: 'GET' }).handler(async () => ({
  paystack: paystackEnabled(),
}))

export const placeOrder = createServerFn({ method: 'POST' })
  .validator(placeOrderInput)
  .handler(async ({ data }) => {
    // Prices always come from the server-side menu, never from the client.
    const lines: OrderLine[] = data.items.map(({ itemId, quantity }) => {
      const item = menuById.get(itemId)
      if (!item) throw new Error('An item in your cart is no longer available')
      return {
        itemId,
        name: item.name,
        quantity,
        unitPriceCents: item.priceCents,
      }
    })
    const subtotal = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
    if (data.fulfillment === 'delivery' && subtotal < DELIVERY_MINIMUM_CENTS) {
      throw new Error('Delivery orders have a minimum subtotal')
    }
    if (data.fulfillment === 'delivery' && !data.deliveryPlaceId) {
      throw new Error('Select a delivery address from Google Maps')
    }
    const delivery = data.fulfillment === 'delivery' ? await quoteDelivery(data.deliveryPlaceId!) : null
    const totals = calculateTotals(subtotal, data.fulfillment, delivery?.feeCents ?? 0)
    const payOnline = data.paymentMethod === 'paystack'
    if (payOnline && !paystackEnabled()) throw new Error('Online payment is not available right now')
    const code = makeCode()
    const reference = payOnline ? makeReference(code) : null

    const [order] = await db
      .insert(orders)
      .values({
        code,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || null,
        fulfillment: data.fulfillment,
        address: delivery?.address ?? null,
        notes: data.notes || null,
        items: lines,
        ...totals,
        paymentMethod: data.paymentMethod,
        paymentStatus: payOnline ? 'pending' : 'unpaid',
        paymentReference: reference,
      })
      .returning({ id: orders.id, code: orders.code })

    if (!payOnline || !reference || !data.email) return { code: order.code, paymentUrl: null }
    try {
      const paymentUrl = await initializeTransaction({
        email: data.email,
        amountCents: totals.totalCents,
        reference,
        callbackUrl: callbackUrl(order.code),
        orderCode: order.code,
      })
      return { code: order.code, paymentUrl }
    } catch (error) {
      // Don't leave an order behind that the customer was never able to pay for.
      await db.delete(orders).where(eq(orders.id, order.id))
      throw error
    }
  })

/** Starts a new Paystack attempt for an online order that hasn't been paid yet. */
export const retryPayment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{6}$/),
    }),
  )
  .handler(async ({ data }) => {
    const [order] = await db.select().from(orders).where(eq(orders.code, data.code)).limit(1)
    if (!order || order.paymentMethod !== 'paystack' || order.paymentStatus === 'paid' || !order.email) {
      throw new Error('This order can’t be paid online')
    }
    if (order.paymentReference && (await syncPayment(order.paymentReference).catch(() => null)) === 'paid') {
      return { paymentUrl: null }
    }
    const reference = makeReference(order.code)
    await db
      .update(orders)
      .set({ paymentReference: reference, paymentStatus: 'pending' })
      .where(eq(orders.id, order.id))
    const paymentUrl = await initializeTransaction({
      email: order.email,
      amountCents: order.totalCents,
      reference,
      callbackUrl: callbackUrl(order.code),
      orderCode: order.code,
    })
    return { paymentUrl }
  })

export const getOrder = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{6}$/),
    }),
  )
  .handler(async ({ data }) => {
    const [order] = await db.select().from(orders).where(eq(orders.code, data.code)).limit(1)
    if (!order) return null
    let paymentStatus = order.paymentStatus
    // Customers land here straight from Paystack, so confirm the payment before showing it.
    if (order.paymentMethod === 'paystack' && paymentStatus === 'pending' && order.paymentReference) {
      paymentStatus = (await syncPayment(order.paymentReference).catch(() => null)) ?? paymentStatus
    }
    // Only return what the confirmation page needs.
    return {
      code: order.code,
      customerName: order.customerName,
      fulfillment: order.fulfillment as 'pickup' | 'delivery',
      address: order.address,
      items: order.items,
      subtotalCents: order.subtotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      status: order.status,
      paymentMethod: order.paymentMethod as 'in_person' | 'paystack',
      paymentStatus,
      createdAt: order.createdAt.toISOString(),
    }
  })
