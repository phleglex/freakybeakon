import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { menuById, type MenuItem } from '@/lib/menu'

const STORAGE_KEY = 'golden-coop-cart'

export type CartLine = { item: MenuItem; quantity: number }

type CartContextValue = {
  lines: CartLine[]
  /** False until the saved cart has been read from localStorage. */
  ready: boolean
  count: number
  subtotalCents: number
  isOpen: boolean
  setOpen: (open: boolean) => void
  add: (itemId: string) => void
  setQuantity: (itemId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      if (saved && typeof saved === 'object') {
        const valid: Record<string, number> = {}
        for (const [id, qty] of Object.entries(saved)) {
          if (menuById.has(id) && typeof qty === 'number' && qty > 0) valid[id] = Math.min(qty, 20)
        }
        setQuantities(valid)
      }
    } catch {
      // Ignore a corrupted saved cart.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities))
  }, [quantities, loaded])

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(quantities).flatMap(([id, quantity]) => {
      const item = menuById.get(id)
      return item ? [{ item, quantity }] : []
    })
    return {
      lines,
      ready: loaded,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents: lines.reduce((sum, line) => sum + line.item.priceCents * line.quantity, 0),
      isOpen,
      setOpen,
      add: (itemId) =>
        setQuantities((q) => ({ ...q, [itemId]: Math.min((q[itemId] ?? 0) + 1, 20) })),
      setQuantity: (itemId, quantity) =>
        setQuantities((q) => {
          const next = { ...q }
          if (quantity <= 0) delete next[itemId]
          else next[itemId] = Math.min(quantity, 20)
          return next
        }),
      clear: () => setQuantities({}),
    }
  }, [quantities, isOpen, loaded])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
