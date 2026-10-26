import { useEffect, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  AuthError,
  MissingIdentityError,
  acceptInvite,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  updateUser,
} from '@netlify/identity'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { getSession } from '@/lib/admin.functions'
import { imageUrl } from '@/lib/menu'

export const Route = createFileRoute('/admin_/login')({
  head: () => ({
    meta: [{ title: 'Staff login · Freaky Beakon' }, { name: 'robots', content: 'noindex' }],
  }),
  beforeLoad: async () => {
    const session = await getSession()
    if (session?.isAdmin) throw redirect({ to: '/admin' })
    return { session }
  },
  component: AdminLogin,
})

const loginSchema = z.object({
  email: z.email('Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.'),
})

type Callback = { type: 'invite'; token: string } | { type: 'recovery' } | null

function AdminLogin() {
  const { session } = Route.useRouteContext()
  const [signingOut, setSigningOut] = useState(false)
  const [callback, setCallback] = useState<Callback>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Invite, recovery and confirmation links arrive with a token in the URL hash.
  useEffect(() => {
    handleAuthCallback()
      .then((result) => {
        if (!result) return
        if (result.type === 'invite' && result.token) setCallback({ type: 'invite', token: result.token })
        else if (result.type === 'recovery') setCallback({ type: 'recovery' })
        else if (result.type === 'confirmation') window.location.assign('/admin')
      })
      .catch(() => setNotice('That link has expired or was already used.'))
  }, [])
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = form.handleSubmit(async ({ email, password }) => {
    form.clearErrors('root')
    try {
      await login(email, password)
      // Full page load so the server sees the new session cookie.
      window.location.assign('/admin')
    } catch (error) {
      let message = 'We couldn’t sign you in. Please try again.'
      if (error instanceof MissingIdentityError) message = 'Staff login isn’t set up on this site yet.'
      else if (error instanceof AuthError && error.status === 401) message = 'Invalid email or password.'
      else if (error instanceof AuthError) message = error.message
      form.setError('root', { message })
    }
  })

  const signOut = async () => {
    setSigningOut(true)
    await logout().catch(() => undefined)
    window.location.href = '/admin/login'
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src={imageUrl('logo.png', 192)}
            alt="Freaky Beakon"
            width={88}
            height={88}
            className="size-22 mix-blend-multiply"
          />
          <h1 className="font-display text-2xl">Staff login</h1>
          <p className="text-sm text-muted-foreground">Manage orders and see how sales are going.</p>
        </div>

        {notice && (
          <p role="status" className="rounded-lg bg-accent p-3 text-sm">
            {notice}
          </p>
        )}

        {callback ? (
          <SetPassword callback={callback} />
        ) : session && !session.isAdmin ? (
          <div role="alert" className="space-y-4 text-sm">
            <p className="rounded-lg bg-accent p-3">
              You’re signed in as <strong>{session.email}</strong>, but this account doesn’t have admin access. Ask the
              owner to add the <code>admin</code> role to your account.
            </p>
            <Button variant="outline" className="w-full" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign in with another account'}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={submit} noValidate>
              <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root && (
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full">
                  {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={async () => {
                    const email = form.getValues('email')
                    if (!(await form.trigger('email'))) return
                    await requestPasswordRecovery(email).catch(() => undefined)
                    setNotice(`If ${email} has an account, we’ve sent a reset link.`)
                  }}
                >
                  Forgot password?
                </Button>
              </fieldset>
            </form>
          </Form>
        )}
      </div>
    </main>
  )
}

function SetPassword({ callback }: { callback: NonNullable<Callback> }) {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  })
  const submit = form.handleSubmit(async ({ password }) => {
    try {
      if (callback.type === 'invite') await acceptInvite(callback.token, password)
      else await updateUser({ password })
      window.location.assign('/admin')
    } catch (error) {
      form.setError('root', {
        message: error instanceof AuthError ? error.message : 'We couldn’t save your password. Please try again.',
      })
    }
  })
  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {callback.type === 'invite'
              ? 'Choose a password to finish setting up your account.'
              : 'Choose a new password.'}
          </p>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button type="submit" className="w-full">
            {form.formState.isSubmitting ? 'Saving…' : 'Save password'}
          </Button>
        </fieldset>
      </form>
    </Form>
  )
}
