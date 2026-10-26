import { deliveryFeeForMeters, type DeliveryQuote } from '@/lib/delivery'

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Delivery address search is not configured. Please choose pickup or contact the shop.')
  return key
}

async function googleRequest<T>(url: string, init: RequestInit, fieldMask?: string): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
    },
  })
  if (!response.ok) throw new Error('Google Maps is unavailable. Please try again or choose pickup.')
  return response.json() as Promise<T>
}

export async function searchDeliveryPlaces(input: string, sessionToken: string) {
  const result = await googleRequest<{
    suggestions?: Array<{
      placePrediction?: { placeId: string; text: { text: string } }
    }>
  }>('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ['gh'],
      languageCode: 'en',
    }),
  })
  return (result.suggestions ?? []).flatMap(({ placePrediction }) =>
    placePrediction
      ? [
          {
            placeId: placePrediction.placeId,
            address: placePrediction.text.text,
          },
        ]
      : [],
  )
}

export async function quoteDelivery(placeId: string, sessionToken?: string): Promise<DeliveryQuote> {
  const params = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ''
  const place = await googleRequest<{
    formattedAddress?: string
    location?: { latitude: number; longitude: number }
  }>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${params}`,
    { method: 'GET' },
    'formattedAddress,location',
  )
  if (!place.formattedAddress || !place.location) throw new Error('Please select a more specific delivery address.')
  const originPlaceId = process.env.GOOGLE_MAPS_ORIGIN_PLACE_ID
  const result = await googleRequest<{
    routes?: Array<{ distanceMeters?: number }>
  }>(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      body: JSON.stringify({
        origin: originPlaceId ? { placeId: originPlaceId } : { address: 'Pentecost Street 24, Gbawe, Accra, Ghana' },
        destination: { location: { latLng: place.location } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    },
    'routes.distanceMeters',
  )
  const distanceMeters = result.routes?.[0]?.distanceMeters
  if (distanceMeters === undefined)
    throw new Error('No driving route was found. Please choose another address or pickup.')
  return {
    placeId,
    address: place.formattedAddress,
    distanceMeters,
    feeCents: deliveryFeeForMeters(distanceMeters),
  }
}
