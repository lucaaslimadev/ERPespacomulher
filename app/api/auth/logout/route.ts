import { NextResponse } from 'next/server'
import { AUTH } from '@/lib/constants'

export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado com sucesso' })
  response.cookies.delete(AUTH.TOKEN_COOKIE)
  response.cookies.delete(AUTH.BEARER_COOKIE)
  return response
}
