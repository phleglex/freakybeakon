import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { SiteFooter, SiteHeader } from '@/components/site-header'
import { CartProvider } from '@/lib/cart'

import '../styles.css'

const siteName = 'Freaky Beakon — Fried Chicken'
const siteDescription = 'Hand-breaded, buttermilk-brined fried chicken. Order online for pickup or delivery.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        property: 'og:image',
        content: '/img/logo.png',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: '/img/logo.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=DM+Sans:opsz,wght@9..40,400..700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // The admin pages have their own header and no cart.
  const isAdmin = useRouterState({ select: (s) => s.location.pathname.startsWith('/admin') })

  // Identity invite and password-reset emails link to the home page; hand them to the staff login.
  useEffect(() => {
    if (!isAdmin && /(invite|recovery|confirmation)_token=/.test(window.location.hash)) {
      window.location.replace(`/admin/login${window.location.hash}`)
    }
  }, [isAdmin])
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>
          <CartProvider>
            <div className="flex min-h-screen flex-col">
              {isAdmin ? (
                children
              ) : (
                <>
                  <SiteHeader />
                  <main className="flex-1">{children}</main>
                  <SiteFooter />
                </>
              )}
            </div>
          </CartProvider>
        </TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
