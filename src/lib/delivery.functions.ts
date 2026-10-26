import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { quoteDelivery, searchDeliveryPlaces } from '@/lib/delivery.server'

export const searchAddresses = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      input: z.string().trim().min(3).max(200),
      sessionToken: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return {
        suggestions: await searchDeliveryPlaces(data.input, data.sessionToken),
        error: null,
      }
    } catch (error) {
      return {
        suggestions: [],
        error: error instanceof Error ? error.message : 'Address search is unavailable.',
      }
    }
  })

export const getDeliveryQuote = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      placeId: z.string().min(1).max(300),
      sessionToken: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return {
        quote: await quoteDelivery(data.placeId, data.sessionToken),
        error: null,
      }
    } catch (error) {
      return {
        quote: null,
        error: error instanceof Error ? error.message : 'Could not calculate delivery.',
      }
    }
  })
