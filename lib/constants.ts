/**
 * Constantes da aplicação
 */
export const AUTH = {
  TOKEN_COOKIE: 'token',
  BEARER_COOKIE: 'erp_bearer',
  STORAGE_KEY: 'erp_token',
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 dias
} as const
