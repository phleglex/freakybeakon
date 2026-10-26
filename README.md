# Golden Coop Fried Chicken

The website for Golden Coop, a fried chicken shop. Visitors browse the menu, build an order in a cart, and check out for pickup or local delivery. Every order is saved to a database and gets a shareable confirmation page with an order number and an estimated ready time.

## Features

- **Landing page and menu** (`/`): hero, highlights, a filterable menu (buckets, sandwiches, tenders & wings, plates, sides, drinks) and a visit/hours section.
- **Cart drawer**: add, remove and change quantities from any page. The cart is saved in the browser, so it survives a refresh.
- **Checkout** (`/checkout`): pickup or delivery, contact details, order notes, live subtotal, tax and delivery fee, and a delivery minimum. Customers pay at the counter or to the driver.
- **Order confirmation** (`/order/<code>`): order number, progress steps, items, totals and ETA.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, Vite)
- Tailwind CSS 4 and shadcn/ui components
- Netlify Database (managed Postgres) with Drizzle ORM for orders
- Netlify Image CDN for the food photography in `public/img`

## Running locally

```bash
pnpm install
netlify dev        # runs the app with Netlify Database and Image CDN emulation
```

`pnpm dev` also starts the Vite dev server on port 3000, but database calls and `/.netlify/images` need `netlify dev`.

## Changing the menu

Menu items, prices, tax rate, delivery fee and delivery minimum all live in `src/lib/menu.ts`. Prices are recalculated on the server when an order is placed, so editing that file is all that's needed.

## Database

The schema is in `db/schema.ts`. After changing it, generate a migration:

```bash
npx drizzle-kit generate --name <describe_the_change>
```

Netlify applies migrations automatically on deploy.

## What's next

- A staff-only kitchen screen (behind Netlify Identity) to see incoming orders and move them through *received → preparing → ready*.
- Text or email notifications when an order is ready.
- Online card payment.
