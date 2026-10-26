import { useState } from 'react'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { logout } from '@netlify/identity'
import { BarChart3, ClipboardList, ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/admin.functions'
import { imageUrl } from '@/lib/menu'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [{ title: 'Admin · Freaky Beakon' }, { name: 'robots', content: 'noindex' }],
  }),
  beforeLoad: async () => {
    const session = await getSession()
    if (!session?.isAdmin) throw redirect({ to: '/admin/login' })
    return { session }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { session } = Route.useRouteContext()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    await logout().catch(() => undefined)
    window.location.href = '/admin/login'
  }

  const navClass =
    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none'

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 rounded-md" aria-label="Admin home">
            <img src={imageUrl('logo.png', 128)} alt="" width={44} height={44} className="size-11 mix-blend-multiply" />
            <span className="hidden font-display text-lg sm:inline">Admin</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1" aria-label="Admin">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              className={navClass}
              activeProps={{
                className: 'bg-primary/10 text-primary hover:text-primary',
              }}
            >
              <ClipboardList className="size-4" /> Orders
            </Link>
            <Link
              to="/admin/sales"
              className={navClass}
              activeProps={{
                className: 'bg-primary/10 text-primary hover:text-primary',
              }}
            >
              <BarChart3 className="size-4" /> Sales
            </Link>
          </nav>
          <a
            href="/"
            className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
          >
            View site <ExternalLink className="size-3.5" />
          </a>
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:inline">{session.email}</span>
          <Button variant="outline" size="sm" onClick={signOut} disabled={signingOut} aria-label="Sign out">
            <LogOut /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
