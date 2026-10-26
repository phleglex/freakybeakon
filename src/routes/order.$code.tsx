import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { CheckCircle2, ChefHat, CreditCard, MapPin, PackageCheck, Phone, Store } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { OrderTotals } from '@/components/order-totals'
import { formatPrice } from '@/lib/menu'
import { getOrder, retryPayment } from '@/lib/orders.functions'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/order/$code')({
  loader: async ({ params }) => {
    if (!/^[A-Za-z0-9]{6}$/.test(params.code)) throw notFound()
    const order = await getOrder({ data: { code: params.code } })
    if (!order) throw notFound()
    return order
  },
  head: ({ params }) => ({ meta: [{ title: `Order ${params.code.toUpperCase()} · Freaky Beakon` }] }),
  component: OrderPage,
})

const steps = [
  { id: 'received', label: 'Order received', icon: CheckCircle2 },
  { id: 'preparing', label: 'In the fryer', icon: ChefHat },
  { id: 'ready', label: 'Ready', icon: PackageCheck },
]

function OrderPage() {
  const order = Route.useLoaderData()
  const placedAt = new Date(order.createdAt)
  const eta = new Date(placedAt.getTime() + (order.fulfillment === 'delivery' ? 45 : 20) * 60_000)
  const currentStep = Math.max(
    0,
    steps.findIndex((s) => s.id === order.status),
  )
  const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 space-y-3 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-3xl" aria-hidden>
          🍗
        </span>
        <h1 className="font-display text-4xl">Thanks, {order.customerName.split(' ')[0]}!</h1>
        {/* The ETA is formatted in the visitor's time zone, which can differ from the server's. */}
        <p className="text-muted-foreground" suppressHydrationWarning>
          Your order is in. We’re breading it up now.{' '}
          {order.fulfillment === 'delivery'
            ? `Expect it at your door around ${time(eta)}.`
            : `It’ll be ready for pickup around ${time(eta)}.`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Order number</p>
            <p className="font-display text-3xl tracking-wider text-primary">{order.code}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium">
            {order.fulfillment === 'delivery' ? <MapPin className="size-4" /> : <Store className="size-4" />}
            {order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}
          </span>
        </div>

        <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Order progress">
          {steps.map((step, i) => {
            const done = i <= currentStep
            return (
              <li key={step.id} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-full',
                    done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <step.icon className="size-5" />
                </span>
                <span className={cn('text-xs font-medium', !done && 'text-muted-foreground')}>
                  {step.label}
                  {i === currentStep && <span className="sr-only"> (current)</span>}
                </span>
              </li>
            )
          })}
        </ol>

        <h2 className="mb-3 font-semibold">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((line) => (
            <li key={line.itemId} className="flex justify-between gap-3">
              <span>
                <span className="font-semibold">{line.quantity}×</span> {line.name}
              </span>
              <span>{formatPrice(line.unitPriceCents * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <OrderTotals {...order} />
        <PaymentNotice code={order.code} method={order.paymentMethod} status={order.paymentStatus} />

        {order.fulfillment === 'delivery' && order.address ? (
          <p className="mt-6 flex gap-2 rounded-lg bg-muted p-3 text-sm">
            <MapPin className="size-4 shrink-0 text-primary" /> Delivering to {order.address}
          </p>
        ) : (
          <p className="mt-6 flex gap-2 rounded-lg bg-muted p-3 text-sm">
            <Store className="size-4 shrink-0 text-primary" /> Pick up at the counter: 412 Magnolia Ave
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Phone className="size-4" /> Need to change something? Call us at (555) 274-2667 and mention order{' '}
          {order.code}.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <a href="/#menu">Back to the menu</a>
        </Button>
      </div>
    </div>
  )
}

function PaymentNotice({ code, method, status }: { code: string; method: 'in_person' | 'paystack'; status: string }) {
  const [pending, setPending] = useState(false)

  if (method === 'in_person') {
    return (
      <p className="mt-6 flex gap-2 rounded-lg border border-border p-3 text-sm">
        <CreditCard className="size-4 shrink-0 text-primary" /> Pay when you collect your order. Cash, card and mobile
        money accepted.
      </p>
    )
  }
  if (status === 'paid') {
    return (
      <p className="mt-6 flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
        <CheckCircle2 className="size-4 shrink-0 text-primary" /> Paid online with Paystack. Thank you!
      </p>
    )
  }

  const pay = async () => {
    setPending(true)
    try {
      const { paymentUrl } = await retryPayment({ data: { code } })
      if (paymentUrl) window.location.href = paymentUrl
      else window.location.reload()
    } catch {
      toast.error('We couldn’t start the payment. Please try again, or pay when you collect.')
      setPending(false)
    }
  }

  return (
    <div role="status" className="mt-6 flex flex-col gap-3 rounded-lg bg-accent p-4 text-sm sm:flex-row sm:items-center">
      <p className="flex flex-1 gap-2">
        <CreditCard className="size-4 shrink-0 text-primary" />
        {status === 'failed'
          ? 'Your payment didn’t go through. You can try again, or pay when you collect.'
          : 'We haven’t received your payment yet. Finish paying to confirm your order.'}
      </p>
      <Button onClick={pay} disabled={pending} className="rounded-full">
        {pending ? 'Opening Paystack…' : 'Pay now'}
      </Button>
    </div>
  )
}
