import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeliveryPicker } from './delivery-picker'
import { getDeliveryQuote, searchAddresses } from '@/lib/delivery.functions'

vi.mock('@/lib/delivery.functions', () => ({
  searchAddresses: vi.fn(),
  getDeliveryQuote: vi.fn(),
}))

describe('delivery address selection', () => {
  it('shows suggestions, quotes a selection, and invalidates the quote on editing', async () => {
    vi.mocked(searchAddresses).mockResolvedValue({
      suggestions: [{ placeId: 'selected', address: 'Gbawe address' }],
      error: null,
    })
    const quote = {
      placeId: 'selected',
      address: 'Gbawe address, Ghana',
      distanceMeters: 4200,
      feeCents: 1500,
    }
    vi.mocked(getDeliveryQuote).mockResolvedValue({ quote, error: null })
    const onChange = vi.fn()
    render(<DeliveryPicker onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Delivery address'), {
      target: { value: 'Gbawe' },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Gbawe address' }))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    expect(screen.getByRole('status')).toHaveTextContent('4.20 km by road')
    fireEvent.change(screen.getByLabelText('Delivery address'), {
      target: { value: 'Another address' },
    })
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows configuration failures without accepting a delivery address', async () => {
    vi.mocked(searchAddresses).mockResolvedValue({
      suggestions: [],
      error: 'Delivery address search is not configured.',
    })
    const onChange = vi.fn()
    render(<DeliveryPicker onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Delivery address'), {
      target: { value: 'Gbawe' },
    })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('not configured'))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
