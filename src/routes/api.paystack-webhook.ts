import { createFileRoute } from '@tanstack/react-router'
import { syncPayment, validWebhookSignature } from '@/lib/paystack.server'

// Paystack calls this after a charge, so orders are marked paid even if the
// customer closes the tab before returning to the confirmation page.
export const Route = createFileRoute('/api/paystack-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text()
        if (!validWebhookSignature(raw, request.headers.get('x-paystack-signature'))) {
          return new Response('Invalid signature', { status: 401 })
        }
        const event = JSON.parse(raw) as {
          event?: string
          data?: { reference?: string }
        }
        if (event.event === 'charge.success' && event.data?.reference) {
          // Re-verify with the API rather than trusting the payload's amount.
          await syncPayment(event.data.reference)
        }
        return new Response('ok')
      },
    },
  },
})
