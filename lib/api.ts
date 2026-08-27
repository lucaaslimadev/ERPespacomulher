import { AUTH } from './constants'

export function setAuthToken(_token: string) {
  if (typeof globalThis.window !== 'undefined') {
    // Sessão passa a ser baseada no cookie HttpOnly emitido pelo backend.
    // Mantemos a função para compatibilidade com chamadas antigas.
  }
}

export function clearAuthToken() {
  if (typeof globalThis.window !== 'undefined') {
    document.cookie = `${AUTH.BEARER_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  }
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
 * Fetch com cookie HttpOnly (credentials: 'include') e tratamento de 401.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth, ...init } = options

  const response = await fetch(url, {
    ...init,
    headers: init.headers,
    credentials: 'include',
  })
  if (response.status === 401 && !skipAuth) {
    handleUnauthorized()
  }
  return response
}
