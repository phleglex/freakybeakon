import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Clock, Flame, MapPin, Plus, Truck, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart'
import {
  categories,
  DELIVERY_MINIMUM_CENTS,
  formatPrice,
  imageUrl,
  menu,
  type MenuCategory,
  type MenuItem,
} from '@/lib/menu'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <Hero />
      <Highlights />
      <MenuSection />
      <Visit />
    </>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-foreground text-background">
      <img
        src={imageUrl('home.jpg', 1600)}
        srcSet={`${imageUrl('home.jpg', 800)} 800w, ${imageUrl('home.jpg', 1600)} 1600w`}
        sizes="100vw"
        alt="A tray of golden fried chicken with honey, pickles and hot sauce"
        className="absolute inset-0 -z-10 size-full object-cover object-right opacity-90"
        fetchPriority="high"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/80 to-transparent" />
      <div className="mx-auto max-w-content px-4 py-24 sm:px-6 sm:py-32">
        <div className="max-w-xl space-y-6">
          <Badge className="bg-secondary text-secondary-foreground">Fried fresh · Never frozen</Badge>
          <h1 className="font-display text-5xl leading-[1.05] sm:text-7xl">Freaky Beakon Fried Chicken</h1>
          <p className="text-lg opacity-85 sm:text-xl">
            Get a bucket ready for pickup in 20 minutes — or delivered hot to your door.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild className="rounded-full px-8 text-base">
              <a href="#menu">Order now</a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-full border-background/40 bg-transparent px-8 text-base text-background hover:bg-background/10 hover:text-background"
            >
              <a href="#visit">Hours & location</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Highlights() {
  const items = [
    {
      icon: Clock,
      title: 'Ready in ~20 min',
      text: 'Every order is breaded and fried when you place it.',
    },
    {
      icon: Truck,
      title: 'Local delivery',
      text: `Within 8 km. Delivery fee depends on driving distance. ${formatPrice(DELIVERY_MINIMUM_CENTS)} minimum.`,
    },
    {
      icon: Flame,
      title: 'Pick your heat',
      text: 'Classic or Nuclear hot — your call.',
    },
  ]
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MenuSection() {
  const [active, setActive] = useState<MenuCategory | 'all'>('all')
  const visible = categories.filter((c) => active === 'all' || c.id === active)

  return (
    <section id="menu" className="scroll-mt-16 py-16">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">The menu</p>
          <h2 className="font-display text-4xl sm:text-5xl">What are you craving?</h2>
        </div>

        <div
          role="tablist"
          aria-label="Menu categories"
          className="sticky top-16 z-30 -mx-4 mb-10 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0"
        >
          {[{ id: 'all' as const, label: 'Everything' }, ...categories].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
                active === c.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/50',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-14">
          {visible.map((category) => (
            <div key={category.id}>
              <h3 className="mb-5 font-display text-2xl">{category.label}</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {menu
                  .filter((item) => item.category === category.id)
                  .map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MenuCard({ item }: { item: MenuItem }) {
  const { add, setOpen } = useCart()
  const onAdd = () => {
    add(item.id)
    toast.success(`${item.name} added`, {
      action: { label: 'View cart', onClick: () => setOpen(true) },
    })
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none">
      {item.image ? (
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={imageUrl(item.image, 640)}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg leading-tight font-semibold">{item.name}</h4>
          <span className="shrink-0 font-display text-lg text-primary">{formatPrice(item.priceCents)}</span>
        </div>
        {item.tags?.length ? (
          <div className="flex gap-1.5">
            {item.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(
                  'capitalize',
                  tag === 'spicy' && 'border-primary/40 text-primary',
                  tag === 'new' && 'border-secondary bg-secondary/40',
                )}
              >
                {tag === 'spicy' && <Flame />}
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
        <Button onClick={onAdd} variant="outline" className="mt-1 w-full border-primary/30 hover:border-primary">
          <Plus />
          Add to order
        </Button>
      </div>
    </article>
  )
}

function Visit() {
  return (
    <section id="visit" className="scroll-mt-16 bg-muted py-16">
      <div className="mx-auto grid max-w-content items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
        <img
          src={imageUrl('sides.png', 900)}
          alt="Mac and cheese, biscuits, coleslaw and fries"
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
        />
        <div className="space-y-5">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">Visit Freaky Beakon</p>
          <h2 className="font-display text-4xl">Order online, or grab it to go</h2>
          <p className="text-muted-foreground">
            Our counter is open seven days a week. Order online and skip the line — we'll text you the moment your
            chicken comes out of the fryer.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="size-5 shrink-0 text-primary" /> Pentecost Street 24, Gbawe
            </li>
            <li className="flex gap-3">
              <Clock className="size-5 shrink-0 text-primary" /> Mon–Thu 11am–9pm · Fri–Sat 11am–10pm · Sun 2pm–8pm
            </li>
            <li className="flex gap-3">
              <UtensilsCrossed className="size-5 shrink-0 text-primary" /> Catering for 20+ — call (+233) 20 983 1705
            </li>
          </ul>
          <Button size="lg" asChild className="rounded-full px-8">
            <a href="#menu">Start an order</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
