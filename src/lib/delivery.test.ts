import { describe, expect, it, vi, afterEach } from 'vitest'
import { deliveryFeeForMeters } from './delivery'
import { quoteDelivery } from './delivery.server'
import { calculateTotals } from './menu'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('distance delivery pricing', () => {
  it.each([
    [0, 1000],
    [3000, 1000],
    [3001, 1500],
    [5000, 1500],
    [5001, 2500],
    [8000, 2500],
  ])('prices %s meters as %s pesewas', (meters, fee) => {
    expect(deliveryFeeForMeters(meters)).toBe(fee)
  })
  it.each([8001, -1, NaN, Infinity])('rejects an unsupported distance: %s', (meters) => {
    expect(() => deliveryFeeForMeters(meters)).toThrow()
  })
  it('keeps pickup free and includes the quoted fee in delivery totals', () => {
    expect(calculateTotals(5000, 'pickup', 2500).totalCents).toBe(5000)
    expect(calculateTotals(5000, 'delivery', 2500).totalCents).toBe(7500)
  })
  it('requires configuration before calling Google', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    await expect(quoteDelivery('destination')).rejects.toThrow('not configured')
  })
  it('quotes the Google road distance and canonical address', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-only')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          formattedAddress: 'Selected address',
          location: { latitude: 5.5, longitude: -0.3 },
        }),
      )
      .mockResolvedValueOnce(Response.json({ routes: [{ distanceMeters: 5001 }] }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await quoteDelivery('destination')).toEqual({
      placeId: 'destination',
      address: 'Selected address',
      distanceMeters: 5001,
      feeCents: 2500,
    })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).travelMode).toBe('DRIVE')
  })
  it('rejects missing routes instead of charging a fallback fee', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-only')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            formattedAddress: 'Address',
            location: { latitude: 5.5, longitude: -0.3 },
          }),
        )
        .mockResolvedValueOnce(Response.json({ routes: [] })),
    )
    await expect(quoteDelivery('destination')).rejects.toThrow('No driving route')
  })
})
