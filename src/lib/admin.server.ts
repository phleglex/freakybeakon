import { getUser, verifyRequestOrigin } from '@netlify/identity'
import { getRequest } from '@tanstack/react-start/server'

export const ADMIN_ROLE = 'admin'

/** Returns the signed-in Identity user if they hold the admin role. */
export async function getAdmin() {
  const user = await getUser()
  if (!user?.roles?.includes(ADMIN_ROLE)) return null
  return user
}

/** Throws unless the request comes from a signed-in admin. Mutations also get a same-origin check. */
export async function requireAdmin({ mutation = false } = {}) {
  if (mutation) verifyRequestOrigin(getRequest())
  const admin = await getAdmin()
  if (!admin) throw new Error('Not authorized')
  return admin
}
