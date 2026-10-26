import { formatPrice } from '@/lib/menu'

export function OrderTotals({
  subtotalCents,
  deliveryFeeCents,
  taxCents,
  totalCents,
}: {
  subtotalCents: number
  deliveryFeeCents: number
  taxCents: number
  totalCents: number
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatPrice(subtotalCents)}</dd>
      </div>
      {deliveryFeeCents > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>{formatPrice(deliveryFeeCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Tax</dt>
        <dd>{formatPrice(taxCents)}</dd>
      </div>
      <div className="flex justify-between pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatPrice(totalCents)}</dd>
      </div>
    </dl>
  )
}
