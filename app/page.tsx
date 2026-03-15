import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AUTH } from '@/lib/constants'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH.TOKEN_COOKIE) || cookieStore.get(AUTH.BEARER_COOKIE)

  if (token) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
