import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Banknote, Bike, CreditCard, ShoppingBag, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useCart } from '@/lib/cart'
import { calculateTotals, DELIVERY_MINIMUM_CENTS, formatPrice } from '@/lib/menu'
import { getPaymentOptions, placeOrder } from '@/lib/orders.functions'
import { cn } from '@/lib/utils'
import { OrderTotals } from '@/components/order-totals'
import { DeliveryPicker } from '@/components/delivery-picker'
import type { DeliveryQuote } from '@/lib/delivery'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/checkout')({
  head: () => ({ meta: [{ title: 'Checkout · Freaky Beakon' }] }),
  loader: () => getPaymentOptions(),
  component: Checkout,
})

const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Enter your name.').max(80),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+()\-.\s]{7,25}$/, 'Enter a valid phone number.'),
    email: z.union([z.email('Enter a valid email address.'), z.literal('')]),
    fulfillment: z.enum(['pickup', 'delivery']),
    address: z.string().trim().max(500),
    notes: z.string().trim().max(500, 'Keep notes under 500 characters.'),
    paymentMethod: z.enum(['in_person', 'paystack']),
  })
  .refine((v) => v.fulfillment === 'pickup' || v.address.length >= 5, {
    message: 'Enter a delivery address.',
    path: ['address'],
  })
  .refine((v) => v.paymentMethod === 'in_person' || v.email.length > 0, {
    message: 'Enter your email to pay online. Paystack sends your receipt there.',
    path: ['email'],
  })

type CheckoutValues = z.infer<typeof checkoutSchema>

function Checkout() {
  const { lines, subtotalCents, clear, ready } = useCart()
  const navigate = useNavigate()
  const paymentOptions = Route.useLoaderData()
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      fulfillment: 'pickup',
      address: '',
      notes: '',
      paymentMethod: paymentOptions.paystack ? 'paystack' : 'in_person',
    },
  })
  const [delivery, setDelivery] = useState<DeliveryQuote | null>(null)
  const fulfillment = form.watch('fulfillment')
  const paymentMethod = form.watch('paymentMethod')
  const totals = calculateTotals(subtotalCents, fulfillment, delivery?.feeCents ?? 0)
  const belowMinimum = fulfillment === 'delivery' && subtotalCents < DELIVERY_MINIMUM_CENTS

  useEffect(() => {
    if (fulfillment === 'pickup') form.clearErrors('address')
  }, [fulfillment, form])

  useEffect(() => {
    if (paymentMethod === 'in_person') form.clearErrors('email')
  }, [paymentMethod, form])

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root')
    if (values.fulfillment === 'delivery' && !delivery) {
      form.setError('address', {
        message: 'Select an address and wait for a delivery quote.',
      })
      return
    }
    try {
      const { code, paymentUrl } = await placeOrder({
        data: {
          ...values,
          deliveryPlaceId: values.fulfillment === 'delivery' ? delivery?.placeId : undefined,
          items: lines.map((l) => ({
            itemId: l.item.id,
            quantity: l.quantity,
          })),
        },
      })
      clear()
      if (paymentUrl) {
        // Paystack's hosted checkout redirects back to the order page when done.
        window.location.href = paymentUrl
        return
      }
      await navigate({ to: '/order/$code', params: { code } })
    } catch {
      form.setError('root', {
        message: 'We couldn’t place your order. Please check your details and try again.',
      })
    }
  })

  if (!ready) {
    return (
      <div
        className="mx-auto grid max-w-content gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px]"
        role="status"
        aria-label="Loading your cart"
      >
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-reading flex-col items-center gap-4 px-4 py-24 text-center">
        <ShoppingBag className="size-12 text-muted-foreground" />
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="text-muted-foreground">Pick something tasty from the menu and come right back.</p>
        <Button asChild size="lg" className="rounded-full px-8">
          <a href="/#menu">Browse the menu</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/"
        hash="menu"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Back to menu
      </Link>
      <h1 className="mb-8 font-display text-4xl">Checkout</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <Form {...form}>
          <form onSubmit={submit} noValidate>
            <fieldset disabled={form.formState.isSubmitting} className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">How would you like it?</h2>
                <FormField
                  control={form.control}
                  name="fulfillment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Pickup or delivery</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            setDelivery(null)
                            form.setValue('address', '')
                          }}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          {[
                            {
                              value: 'pickup',
                              icon: Store,
                              title: 'Pickup',
                              text: 'Ready in about 20 minutes',
                            },
                            {
                              value: 'delivery',
                              icon: Bike,
                              title: 'Delivery',
                              text: 'Fee based on driving distance · 35–45 minutes',
                            },
                          ].map(({ value, icon: Icon, title, text }) => (
                            <label
                              key={value}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors motion-reduce:transition-none',
                                field.value === value ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                              )}
                            >
                              <RadioGroupItem value={value} />
                              <Icon className="size-5 text-primary" />
                              <span>
                                <span className="block font-semibold">{title}</span>
                                <span className="block text-sm text-muted-foreground">{text}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Your details</h2>
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" autoComplete="tel" required {...field} />
                        </FormControl>
                        <FormDescription>We’ll text you when it’s ready.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email
                          {paymentMethod === 'paystack' ? '' : ' (optional)'}
                        </FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {fulfillment === 'delivery' && (
                  <div className="space-y-2">
                    <DeliveryPicker
                      onChange={(quote) => {
                        setDelivery(quote)
                        form.setValue('address', quote?.address ?? '', {
                          shouldValidate: true,
                        })
                      }}
                    />
                    {form.formState.errors.address && (
                      <p role="alert" className="text-sm text-destructive">
                        {form.formState.errors.address.message}
                      </p>
                    )}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="All dark meat, extra pickles, gate code…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold">How would you like to pay?</h2>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Payment method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          {[
                            ...(paymentOptions.paystack
                              ? [
                                  {
                                    value: 'paystack',
                                    icon: CreditCard,
                                    title: 'Pay online',
                                    text: 'Card or mobile money via Paystack',
                                  },
                                ]
                              : []),
                            {
                              value: 'in_person',
                              icon: Banknote,
                              title: fulfillment === 'delivery' ? 'Pay on delivery' : 'Pay at pickup',
                              text: 'Cash, card or mobile money',
                            },
                          ].map(({ value, icon: Icon, title, text }) => (
                            <label
                              key={value}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors motion-reduce:transition-none',
                                field.value === value ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                              )}
                            >
                              <RadioGroupItem value={value} />
                              <Icon className="size-5 text-primary" />
                              <span>
                                <span className="block font-semibold">{title}</span>
                                <span className="block text-sm text-muted-foreground">{text}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </section>

              {belowMinimum && (
                <p role="alert" className="rounded-lg bg-accent p-3 text-sm">
                  Delivery orders need at least {formatPrice(DELIVERY_MINIMUM_CENTS)} of food. Add{' '}
                  {formatPrice(DELIVERY_MINIMUM_CENTS - subtotalCents)} more, or switch to pickup.
                </p>
              )}
              {form.formState.errors.root && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full text-base sm:w-auto sm:px-10"
                disabled={form.formState.isSubmitting || belowMinimum || (fulfillment === 'delivery' && !delivery)}
              >
                {form.formState.isSubmitting
                  ? 'Placing order…'
                  : `${paymentMethod === 'paystack' ? 'Pay' : 'Place order'} · ${formatPrice(totals.totalCents)}`}
              </Button>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === 'paystack'
                  ? 'You’ll be taken to Paystack’s secure checkout, then brought back to your order.'
                  : 'Pay at the counter on pickup, or to your driver on delivery.'}
              </p>
            </fieldset>
          </form>
        </Form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-4 font-display text-xl">Order summary</h2>
          <ul className="space-y-3 text-sm">
            {lines.map(({ item, quantity }) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold">{quantity}×</span> {item.name}
                </span>
                <span>{formatPrice(item.priceCents * quantity)}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <OrderTotals {...totals} />
          {fulfillment === 'delivery' && !delivery && (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a delivery address to calculate the delivery fee and final total.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
