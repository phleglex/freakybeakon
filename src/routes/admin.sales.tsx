import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getSalesReport } from '@/lib/admin.functions'
import { formatPrice } from '@/lib/menu'
import { cn } from '@/lib/utils'

const ranges = [7, 30, 90] as const

export const Route = createFileRoute('/admin/sales')({
  head: () => ({
    meta: [{ title: 'Sales · Freaky Beakon' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  }),
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: ({ deps }) => getSalesReport({ data: { days: deps.days } }),
  pendingComponent: SalesSkeleton,
  component: SalesPage,
})

type Report = Awaited<ReturnType<typeof getSalesReport>>

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

function SalesPage() {
  const report = Route.useLoaderData()
  const { days } = Route.useSearch()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Sales</h1>
          <p className="text-sm text-muted-foreground">
            Counts every order that wasn’t cancelled, except online orders that were never paid.
          </p>
        </div>
        <nav className="flex gap-2" aria-label="Time range">
          {ranges.map((d) => (
            <Link
              key={d}
              to="/admin/sales"
              search={{ days: d }}
              aria-current={days === d ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none',
                days === d
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/50',
              )}
            >
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today" value={formatPrice(report.today.revenueCents)} detail={`${report.today.orders} orders`} />
        <Stat
          label={`Revenue · last ${report.days} days`}
          value={formatPrice(report.revenueCents)}
          detail={`${report.orders} orders`}
        />
        <Stat
          label="Average order"
          value={formatPrice(report.averageCents)}
          detail={`${report.deliveryOrders} delivered`}
        />
        <Stat
          label="Paid so far"
          value={formatPrice(report.collectedCents)}
          detail={`${formatPrice(report.onlineCents)} via Paystack · ${report.cancelled} cancelled`}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Daily revenue</h2>
        <p className="mb-4 text-sm text-muted-foreground">Hover or focus a bar to see that day.</p>
        {report.orders === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No sales in this period yet.</p>
        ) : (
          <DailyChart daily={report.daily} />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Top items</h2>
        {report.topItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing sold in this period yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topItems.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(item.revenueCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function DailyChart({ daily }: { daily: Report['daily'] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...daily.map((d) => d.revenueCents), 1)
  const shown = active === null ? null : daily[active]
  // Label only a handful of dates so they never collide.
  const labelEvery = Math.ceil(daily.length / 6)

  return (
    <div>
      <p className="mb-2 h-5 text-sm tabular-nums" aria-live="polite">
        {shown ? (
          <>
            <span className="font-semibold">{shortDate(shown.date)}</span> · {formatPrice(shown.revenueCents)} ·{' '}
            {shown.orders} orders
          </>
        ) : (
          <span className="text-muted-foreground">Peak day: {formatPrice(max)}</span>
        )}
      </p>
      <div className="relative h-48 border-b border-border" onMouseLeave={() => setActive(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden />
        <ul className="absolute inset-0 flex items-end gap-[2px]" aria-label="Revenue per day">
          {daily.map((d, i) => (
            <li key={d.date} className="flex h-full flex-1 items-end">
              <button
                type="button"
                className="flex h-full w-full items-end rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${shortDate(d.date)}: ${formatPrice(d.revenueCents)}, ${d.orders} orders`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <span
                  className={cn(
                    'block w-full rounded-t-[4px] bg-primary transition-opacity motion-reduce:transition-none',
                    active !== null && active !== i && 'opacity-50',
                  )}
                  style={{
                    height: d.revenueCents ? `${Math.max((d.revenueCents / max) * 100, 2)}%` : 0,
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 flex text-xs text-muted-foreground" aria-hidden>
        {daily.map((d, i) => (
          <span key={d.date} className="flex-1 text-center whitespace-nowrap">
            {i % labelEvery === 0 ? shortDate(d.date) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function SalesSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading sales">
      <Skeleton className="h-10 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
