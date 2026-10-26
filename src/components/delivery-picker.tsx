import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DELIVERY_MAX_KM, DELIVERY_RANGES, type DeliveryQuote } from '@/lib/delivery'
import { getDeliveryQuote, searchAddresses } from '@/lib/delivery.functions'
import { formatPrice } from '@/lib/menu'

export function DeliveryPicker({ onChange }: { onChange: (quote: DeliveryQuote | null) => void }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; address: string }>>([])
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [status, setStatus] = useState('Type at least 3 characters to search for your address.')
  const [busy, setBusy] = useState(false)
  const session = useRef('')
  const version = useRef(0)

  useEffect(() => {
    if (input.trim().length < 3 || quote) return
    const current = version.current
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await searchAddresses({
          data: { input, sessionToken: session.current },
        })
        if (cancelled || current !== version.current) return
        setSuggestions(result.suggestions)
        setStatus(
          result.error ??
            (result.suggestions.length
              ? 'Select your delivery address below.'
              : 'No addresses found. Try a nearby street or landmark.'),
        )
      } catch {
        if (!cancelled && current === version.current)
          setStatus('Address search is unavailable. Try again or choose pickup.')
      } finally {
        if (!cancelled && current === version.current) setBusy(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input, quote])

  async function select(placeId: string) {
    const current = ++version.current
    setSuggestions([])
    setBusy(true)
    setStatus('Calculating driving distance and delivery fee…')
    try {
      const result = await getDeliveryQuote({
        data: { placeId, sessionToken: session.current },
      })
      if (current !== version.current) return
      session.current = crypto.randomUUID()
      if (result.quote) {
        setInput(result.quote.address)
        setQuote(result.quote)
        onChange(result.quote)
        setStatus(
          `${(result.quote.distanceMeters / 1000).toFixed(2)} km by road · ${formatPrice(result.quote.feeCents)} delivery`,
        )
      } else {
        setStatus(result.error ?? 'Could not calculate delivery. Try another address.')
      }
    } catch {
      if (current === version.current) setStatus('Could not calculate delivery. Try again or choose pickup.')
    } finally {
      if (current === version.current) setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <label htmlFor="delivery-search" className="text-sm font-medium">
        Delivery address
      </label>
      <Input
        id="delivery-search"
        value={input}
        autoComplete="off"
        placeholder="Search street, area or landmark"
        aria-describedby="delivery-status delivery-ranges"
        onChange={(event) => {
          version.current++
          if (!session.current) session.current = crypto.randomUUID()
          setInput(event.target.value)
          setQuote(null)
          onChange(null)
          setSuggestions([])
          const searching = event.target.value.trim().length >= 3
          setBusy(searching)
          setStatus(searching ? 'Searching Google Maps…' : 'Type at least 3 characters to search for your address.')
        }}
      />
      {suggestions.length > 0 && (
        <ul
          aria-label="Google Maps address suggestions"
          className="divide-y divide-border rounded-lg border border-border"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                onClick={() => void select(suggestion.placeId)}
              >
                {suggestion.address}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p
        id="delivery-status"
        role="status"
        aria-live="polite"
        aria-busy={busy}
        className="text-sm text-muted-foreground"
      >
        {status}
      </p>
      {quote && (
        <a
          className="text-sm underline"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.address)}&query_place_id=${encodeURIComponent(quote.placeId)}`}
          target="_blank"
          rel="noreferrer"
        >
          View selected location on Google Maps
        </a>
      )}
      <p id="delivery-ranges" className="text-xs text-muted-foreground">
        {DELIVERY_RANGES.map(
          (range, index) =>
            `${index ? DELIVERY_RANGES[index - 1].maxKm : 0}–${range.maxKm} km: ${formatPrice(range.feeCents)}`,
        ).join(' · ')}
        . Delivery within {DELIVERY_MAX_KM} km by road.
      </p>
      <p className="text-right text-xs text-muted-foreground">Powered by Google Maps</p>
    </div>
  )
}
