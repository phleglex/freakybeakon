/** Delivery prices are in pesewas. Ranges use Google's driving distance. */
export const DELIVERY_RANGES = [
  { maxKm: 3, feeCents: 1000 },
  { maxKm: 5, feeCents: 1500 },
  { maxKm: 8, feeCents: 2500 },
]
export const DELIVERY_MAX_KM = DELIVERY_RANGES[DELIVERY_RANGES.length - 1].maxKm

export function deliveryFeeForMeters(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) throw new Error('Invalid delivery distance')
  const range = DELIVERY_RANGES.find((range) => meters <= range.maxKm * 1000)
  if (!range) throw new Error(`This address is outside our ${DELIVERY_MAX_KM} km delivery area.`)
  return range.feeCents
}

export type DeliveryQuote = {
  placeId: string
  address: string
  distanceMeters: number
  feeCents: number
}
