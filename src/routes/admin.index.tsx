import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Bike, CheckCircle2, ClipboardList, CreditCard, Phone, RefreshCw, Store, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { listOrders, updateOrder, type AdminOrder, type OrderStatus } from '@/lib/admin.functions'
import { formatPrice } from '@/lib/menu'
import { cn } from '@/lib/utils'

const views = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
] as const

export const Route = createFileRoute('/admin/')({
  validateSearch: z.object({
    view: z.enum(['active', 'completed', 'cancelled', 'all']).default('active'),
  }),
  loaderDeps: ({ search }) => ({ view: search.view }),
  loader: ({ deps }) => listOrders({ data: { view: deps.view } }),
  pendingComponent: OrdersSkeleton,
  component: OrdersPage,
})

const statusLabel: Record<OrderStatus, string> = {
  received: 'New',
  preparing: 'In the fryer',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  received: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready', label: 'Mark ready' },
  ready: { status: 'completed', label: 'Complete' },
}

function OrdersPage() {
  const orders = Route.useLoaderData()
  const { view } = Route.useSearch()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await router.invalidate()
    setRefreshing(false)
  }

  // Keep the board current while the kitchen has it open.
  useEffect(() => {
    const id = setInterval(() => void router.invalidate(), 30_000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Orders</h1>
          <p className="text-sm text-muted-foreground">Refreshes every 30 seconds. Showing the latest 100.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && 'animate-spin motion-reduce:animate-none')} />
          Refresh
        </Button>
      </div>

      <nav className="flex gap-2 overflow-x-auto" aria-label="Filter orders">
        {views.map((v) => (
          <Link
            key={v.id}
            to="/admin"
            search={{ view: v.id }}
            aria-current={view === v.id ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none',
              view === v.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="font-medium">No {view === 'all' ? '' : `${view} `}orders</p>
          <p className="text-sm text-muted-foreground">New orders show up here as soon as customers check out.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: AdminOrder }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const next = nextStep[order.status]
  const awaitingOnline = order.paymentMethod === 'paystack' && order.paymentStatus !== 'paid'
  const closed = order.status === 'completed' || order.status === 'cancelled'

  const update = async (changes: { status?: OrderStatus; paid?: boolean }, message: string) => {
    setPending(true)
    try {
      await updateOrder({ data: { id: order.id, ...changes } })
      await router.invalidate()
      toast.success(message)
    } catch {
      toast.error('That change didn’t save. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl tracking-wider text-primary">{order.code}</p>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {new Date(order.createdAt).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <Badge
          variant={order.status === 'received' ? 'default' : 'outline'}
          className={cn(order.status === 'ready' && 'border-secondary bg-secondary/50')}
        >
          {statusLabel[order.status]}
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-semibold">{order.customerName}</p>
        <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
          <Phone className="size-3.5" /> {order.phone}
        </a>
        <p className="flex items-start gap-2 text-muted-foreground">
          {order.fulfillment === 'delivery' ? (
            <>
              <Bike className="mt-0.5 size-3.5 shrink-0" /> Delivery to {order.address}
            </>
          ) : (
            <>
              <Store className="mt-0.5 size-3.5 shrink-0" /> Pickup
            </>
          )}
        </p>
      </div>

      <ul className="space-y-1 border-y border-border py-3 text-sm">
        {order.items.map((line) => (
          <li key={line.itemId} className="flex justify-between gap-3">
            <span>
              <span className="font-semibold">{line.quantity}×</span> {line.name}
            </span>
          </li>
        ))}
      </ul>
      {order.notes && <p className="rounded-lg bg-accent p-2 text-sm">“{order.notes}”</p>}

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{formatPrice(order.totalCents)}</span>
        <PaymentBadge order={order} />
      </div>

      {awaitingOnline && !closed && (
        <p className="text-xs text-muted-foreground">Online payment not confirmed yet. Check before preparing.</p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {next && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => update({ status: next.status }, `${order.code}: ${statusLabel[next.status]}`)}
          >
            <CheckCircle2 /> {next.label}
          </Button>
        )}
        {order.paymentMethod === 'in_person' && order.status !== 'cancelled' && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              update(
                { paid: order.paymentStatus !== 'paid' },
                order.paymentStatus === 'paid' ? `${order.code} marked unpaid` : `${order.code} marked paid`,
              )
            }
          >
            <CreditCard /> {order.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}
          </Button>
        )}
        {!closed && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Cancel order ${order.code}?`))
                void update({ status: 'cancelled' }, `${order.code} cancelled`)
            }}
          >
            <XCircle /> Cancel
          </Button>
        )}
        {order.status === 'cancelled' && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => update({ status: 'received' }, `${order.code} restored`)}
          >
            Restore
          </Button>
        )}
      </div>
    </li>
  )
}

function PaymentBadge({ order }: { order: AdminOrder }) {
  const method = order.paymentMethod === 'paystack' ? 'Paystack' : 'In person'
  if (order.paymentStatus === 'paid') {
    return <Badge className="border-transparent bg-primary/10 text-primary">Paid · {method}</Badge>
  }
  const label =
    order.paymentStatus === 'failed'
      ? 'Payment failed'
      : order.paymentStatus === 'pending'
        ? 'Awaiting payment'
        : 'Unpaid'
  return (
    <Badge
      variant="outline"
      className={cn(order.paymentStatus === 'failed' && 'border-destructive/40 text-destructive')}
    >
      {label} · {method}
    </Badge>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading orders">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-8 w-80" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
