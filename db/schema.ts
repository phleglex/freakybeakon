import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export type OrderLine = {
  itemId: string
  name: string
  quantity: number
  unitPriceCents: number
}

export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  customerName: text('customer_name').notNull(),
  phone: text().notNull(),
  email: text(),
  fulfillment: text().notNull(),
  address: text(),
  notes: text(),
  items: jsonb().$type<OrderLine[]>().notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  status: text().notNull().default('received'),
  paymentMethod: text('payment_method').notNull().default('in_person'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  paymentReference: text('payment_reference').unique(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
