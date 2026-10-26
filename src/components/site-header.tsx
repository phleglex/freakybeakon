import { Link } from '@tanstack/react-router'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCart } from '@/lib/cart'
import { formatPrice, imageUrl } from '@/lib/menu'

export function Logo() {
  return (
    <Link to="/" className="flex items-center rounded-md" aria-label="Freaky Beakon home">
      {/* The logo artwork includes the name, so no separate text label is needed. */}
      <img src={imageUrl('logo.png', 192)} alt="Freaky Beakon" width={56} height={56} className="size-14 mix-blend-multiply" />
    </Link>
  )
}

export function SiteHeader() {
  const { count, setOpen } = useCart()
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <a href="/#menu" className="hover:text-primary">
            Menu
          </a>
          <a href="/#visit" className="hover:text-primary">
            Visit us
          </a>
        </nav>
        <Button onClick={() => setOpen(true)} className="rounded-full" aria-label={`Open cart, ${count} items`}>
          <ShoppingBag />
          <span>Cart</span>
          {count > 0 && (
            <span className="ml-1 grid min-w-5 place-items-center rounded-full bg-secondary px-1.5 text-xs font-bold text-secondary-foreground">
              {count}
            </span>
          )}
        </Button>
      </div>
      <CartSheet />
    </header>
  )
}

function CartSheet() {
  const { lines, subtotalCents, isOpen, setOpen, setQuantity } = useCart()
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your order</SheetTitle>
          <SheetDescription>Fried fresh the moment you check out.</SheetDescription>
        </SheetHeader>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add a bucket, a sandwich or a few sides to get started.</p>
            <Button variant="outline" onClick={() => setOpen(false)} asChild>
              <a href="/#menu">Browse the menu</a>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-4">
              {lines.map(({ item, quantity }) => (
                <li key={item.id} className="flex gap-3 py-4">
                  {item.image ? (
                    <img
                      src={imageUrl(item.image, 160)}
                      alt=""
                      className="size-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-2xl" aria-hidden>
                      🥤
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium leading-tight">{item.name}</p>
                      <p className="font-semibold">{formatPrice(item.priceCents * quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => setQuantity(item.id, quantity - 1)}
                      >
                        {quantity === 1 ? <Trash2 /> : <Minus />}
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                        {quantity}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Add one ${item.name}`}
                        onClick={() => setQuantity(item.id, quantity + 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <SheetFooter className="border-t border-border">
              <div className="flex justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Tax and any delivery fee are added at checkout.</p>
              <Button size="lg" asChild onClick={() => setOpen(false)}>
                <Link to="/checkout">Go to checkout</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <img
            src={imageUrl('logo.png', 192)}
            alt="Freaky Beakon"
            width={80}
            height={80}
            loading="lazy"
            className="size-20 rounded-xl bg-white"
          />
          <p className="text-sm opacity-70">Fried chicken, made to order since 2026.</p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Hours</p>
          <p className="opacity-70">Mon–Thu 11am – 9pm</p>
          <p className="opacity-70">Fri–Sat 11am – 11pm</p>
          <p className="opacity-70">Sun 12pm – 8pm</p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Find us</p>
          <p className="opacity-70">Pentecost Street 24, Gbawe</p>
          <p className="opacity-70">+233 20 983 1705</p>
        </div>
      </div>
      <p className="border-t border-background/10 py-4 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Freaky Beakon Fried Chicken
      </p>
    </footer>
  )
}
