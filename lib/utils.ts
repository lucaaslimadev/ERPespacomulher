import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/** Escapa HTML para prevenir XSS em conteúdo dinâmico (ex.: cupom fiscal). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Converte o campo error da resposta da API em uma string para exibir no toast (evita "[object Object]"). */
export function getApiErrorMessage(data: { error?: unknown; details?: string } | null, fallback: string): string {
  if (!data) return fallback
  const e = data.error
  if (e == null) return data.details && typeof data.details === 'string' ? data.details : fallback
  if (typeof e === 'string') return e
  if (Array.isArray(e)) {
    const parts = e.map((x: unknown) => {
      if (x == null) return ''
      if (typeof x === 'string') return x
      if (typeof x === 'object' && 'message' in x && typeof (x as { message: unknown }).message === 'string') {
        return (x as { message: string }).message
      }
      return ''
    }).filter(Boolean)
    return parts.length ? parts.join(', ') : fallback
  }
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return fallback
}
