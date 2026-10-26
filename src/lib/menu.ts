export type MenuCategory = 'tenders' | 'burgers' | 'fried-chicken' | 'sauces' | 'sides' | 'drinks'

export type MenuItem = {
  id: string
  name: string
  description: string
  /** Price in pesewas (1/100 of a Ghana cedi). */
  priceCents: number
  category: MenuCategory
  /** Product picture path or URL. */
  image?: string
  tags?: Array<'popular' | 'spicy' | 'new'>
}

export const categories: Array<{
  id: MenuCategory
  label: string
}> = [
  { id: 'tenders', label: 'Tenders' },
  { id: 'burgers', label: 'Burgers' },
  { id: 'fried-chicken', label: 'Fried Chicken' },
  { id: 'sauces', label: 'Dips & Sauces' },
  { id: 'sides', label: 'Sides' },
  { id: 'drinks', label: 'Drinks' },
]

export const menu: MenuItem[] = [
  // Tenders
  {
    id: 'tenders',
    name: 'Tenders',
    description: 'Golden, crispy chicken tenders. Perfect for dipping.',
    priceCents: 0, // Replace with actual price
    category: 'tenders',
    image: 'tenders.jpg', // Add picture path
    tags: [],
  },

  // Burgers
  {
    id: 'beakon-burger',
    name: 'Beakon Burger',
    description: 'A classic crispy chicken burger.',
    priceCents: 0,
    category: 'burgers',
    image: 'burger.jpg',
    tags: [],
  },
  {
    id: 'nuclear-beakon-burger',
    name: 'Nuclear Beakon Burger',
    description: 'A fiery chicken burger for heat seekers.',
    priceCents: 0,
    category: 'burgers',
    image: 'nuclear_burger.jpg',
    tags: ['spicy'],
  },

  // Fried Chicken
  {
    id: 'quarters',
    name: 'Quarters',
    description: 'Crispy, juicy fried chicken Quarters.',
    priceCents: 0,
    category: 'fried-chicken',
    image: 'quarters.jpg',
    tags: [],
  },
  {
    id: 'nuclear-quarters',
    name: 'Nuclear quarters',
    description: 'Crispy fried chicken quarters with a spicy kick.',
    priceCents: 0,
    category: 'fried-chicken',
    image: 'nuclear_quarters.jpg',
    tags: ['spicy'],
  },

  // Dips & Sauces
  {
    id: 'yellow-sauce',
    name: 'Yellow Sauce',
    description: 'Our signature yellow dipping sauce.',
    priceCents: 0,
    category: 'sauces',
    image: 'yellow_sauce.jpg',
    tags: [],
  },
  {
    id: 'bomb-sauce',
    name: 'Bomb Sauce',
    description: 'Our signature Bomb Sauce.',
    priceCents: 0,
    category: 'sauces',
    image: 'bomb_sauce.jpg',
    tags: [],
  },
  {
    id: 'honey-sauce',
    name: 'Honey Sauce',
    description: 'A sweet honey dipping sauce.',
    priceCents: 0,
    category: 'sauces',
    image: 'honey_sauce.jpg',
    tags: [],
  },

  // Sides
  {
    id: 'coleslaw',
    name: 'Coleslaw',
    description: 'A cool, crunchy side.',
    priceCents: 0,
    category: 'sides',
    image: 'coleslaw.jpg',
    tags: [],
  },

  // Drinks
  {
    id: 'yoghurt',
    name: 'Yoghurt',
    description: 'Chilled yoghurt.',
    priceCents: 0,
    category: 'drinks',
    image: 'yoghurt.jpg',
    tags: [],
  },
  {
    id: 'coca-cola',
    name: 'Coca-Cola',
    description: 'Chilled Coca-Cola.',
    priceCents: 1000,
    category: 'drinks',
    image: 'coke.jpg',
    tags: [],
  },
  {
    id: 'diet-coke',
    name: 'Diet Coke',
    description: 'Chilled Diet Coke.',
    priceCents: 1500,
    category: 'drinks',
    image: 'diet_coke.jpg',
    tags: [],
  },
]

export const menuById = new Map(menu.map((item) => [item.id, item]))

export const TAX_RATE = 0.0
export const DELIVERY_MINIMUM_CENTS = 1500
export const CURRENCY = 'GHS'

const cedis = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(cents: number) {
  return `GH₵${cedis.format(cents / 100)}`
}

export function imageUrl(file: string, width: number) {
  return `/.netlify/images?url=/img/${file}&w=${width}&fm=webp`
}

export function calculateTotals(subtotalCents: number, fulfillment: 'pickup' | 'delivery', quotedDeliveryFeeCents = 0) {
  const deliveryFeeCents = fulfillment === 'delivery' ? quotedDeliveryFeeCents : 0
  const taxCents = Math.round(subtotalCents * TAX_RATE)
  return {
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents: subtotalCents + deliveryFeeCents + taxCents,
  }
}
