import { AUTH } from './constants'

export function setAuthToken(token: string) {
  if (typeof globalThis.window !== 'undefined') {
    sessionStorage.setItem(AUTH.STORAGE_KEY, token)
    document.cookie = `${AUTH.BEARER_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${AUTH.COOKIE_MAX_AGE}; SameSite=Lax`
  }
}

export function clearAuthToken() {
  if (typeof globalThis.window !== 'undefined') {
    sessionStorage.removeItem(AUTH.STORAGE_KEY)
    document.cookie = `${AUTH.BEARER_COOKIE}=; path=/; max-age=0`
  }
}

function getAuthToken(): string | null {
  if (typeof globalThis.window === 'undefined') return null
  return sessionStorage.getItem(AUTH.STORAGE_KEY)
}

/** Redireciona para login quando 401 - evita telas vazias sem feedback */
function handleUnauthorized() {
  if (typeof globalThis.window !== 'undefined') {
    clearAuthToken()
    globalThis.window.location.href = '/login'
  }
}

export interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Fetch com credentials: 'include', Authorization header e tratamento de 401.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth, ...init } = options
  const headers = new Headers(init.headers)
  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (response.status === 401 && !skipAuth) {
    handleUnauthorized()
  }
  return response
}
