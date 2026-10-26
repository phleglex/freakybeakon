import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'
import { ADMIN_ROLE, requireAdmin } from '@/lib/admin.server'

export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'completed', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Who is signed in, and whether they can use the admin pages. */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getUser()
  if (!user) return null
  return {
    email: user.email ?? '',
    isAdmin: Boolean(user.roles?.includes(ADMIN_ROLE)),
  }
})

const views = {
  active: ['received', 'preparing', 'ready'],
  completed: ['completed'],
  cancelled: ['cancelled'],
} as const

export const listOrders = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      view: z.enum(['active', 'completed', 'cancelled', 'all']).default('active'),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const rows = await db
      .select()
      .from(orders)
      .where(data.view === 'all' ? undefined : inArray(orders.status, [...views[data.view]]))
      .orderBy(desc(orders.createdAt))
      .limit(100)
    return rows.map((o) => ({
      id: o.id,
      code: o.code,
      customerName: o.customerName,
      phone: o.phone,
      email: o.email,
      fulfillment: o.fulfillment as 'pickup' | 'delivery',
      address: o.address,
      notes: o.notes,
      items: o.items,
      totalCents: o.totalCents,
      status: o.status as OrderStatus,
      paymentMethod: o.paymentMethod as 'in_person' | 'paystack',
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    }))
  })

export type AdminOrder = Awaited<ReturnType<typeof listOrders>>[number]

export const updateOrder = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int().positive(),
      status: z.enum(ORDER_STATUSES).optional(),
      paid: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin({ mutation: true })
    if (data.status) {
      await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.id))
    }
    if (data.paid !== undefined) {
      // Online payments are confirmed by Paystack, so only in-person payments can be marked by hand.
      await db
        .update(orders)
        .set({
          paymentStatus: data.paid ? 'paid' : 'unpaid',
          paidAt: data.paid ? new Date() : null,
        })
        .where(and(eq(orders.id, data.id), eq(orders.paymentMethod, 'in_person')))
    }
    return { ok: true }
  })

const DAY = 86_400_000

export const getSalesReport = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    // Ghana is on UTC all year, so UTC calendar days match the shop's days.
    const today = new Date(new Date().toISOString().slice(0, 10))
    const since = new Date(today.getTime() - (data.days - 1) * DAY)
    const rows = await db
      .select({
        items: orders.items,
        totalCents: orders.totalCents,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        fulfillment: orders.fulfillment,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(gte(orders.createdAt, since))

    // A sale is any order that wasn't cancelled, except online orders that were never paid.
    const sales = rows.filter(
      (o) => o.status !== 'cancelled' && (o.paymentMethod === 'in_person' || o.paymentStatus === 'paid'),
    )

    const daily = Array.from({ length: data.days }, (_, i) => ({
      date: new Date(since.getTime() + i * DAY).toISOString().slice(0, 10),
      revenueCents: 0,
      orders: 0,
    }))
    const byDate = new Map(daily.map((d) => [d.date, d]))
    const items = new Map<string, { name: string; quantity: number; revenueCents: number }>()
    let onlineCents = 0
    let collectedCents = 0
    let deliveryOrders = 0

    for (const o of sales) {
      const day = byDate.get(o.createdAt.toISOString().slice(0, 10))
      if (day) {
        day.revenueCents += o.totalCents
        day.orders += 1
      }
      if (o.paymentMethod === 'paystack') onlineCents += o.totalCents
      if (o.paymentStatus === 'paid') collectedCents += o.totalCents
      if (o.fulfillment === 'delivery') deliveryOrders += 1
      for (const line of o.items) {
        const entry = items.get(line.itemId) ?? {
          name: line.name,
          quantity: 0,
          revenueCents: 0,
        }
        entry.quantity += line.quantity
        entry.revenueCents += line.quantity * line.unitPriceCents
        items.set(line.itemId, entry)
      }
    }

    const revenueCents = sales.reduce((sum, o) => sum + o.totalCents, 0)
    const todayStats = daily[daily.length - 1]
    return {
      days: data.days,
      revenueCents,
      orders: sales.length,
      averageCents: sales.length ? Math.round(revenueCents / sales.length) : 0,
      collectedCents,
      onlineCents,
      deliveryOrders,
      cancelled: rows.filter((o) => o.status === 'cancelled').length,
      today: {
        revenueCents: todayStats.revenueCents,
        orders: todayStats.orders,
      },
      daily,
      topItems: [...items.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8),
    }
  })
