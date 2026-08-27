import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AUTH } from '@/lib/constants'

export default async function Home() {
  const cookieStore = await cookies()
  const allowLegacyTokenFallback =
    process.env.NODE_ENV !== 'production' && process.env.ALLOW_LEGACY_TOKEN_FALLBACK === '1'
  const token = cookieStore.get(AUTH.TOKEN_COOKIE) ||
    (allowLegacyTokenFallback ? cookieStore.get(AUTH.BEARER_COOKIE) : undefined)

  if (token) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
