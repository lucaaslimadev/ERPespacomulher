'use client'

// Componente para forçar redirecionamento após login
export function ForceRedirect({ to }: { to: string }) {
  if (typeof window !== 'undefined') {
    // Múltiplas tentativas de redirecionamento
    window.location.replace(to)
    
    setTimeout(() => {
      if (window.location.pathname !== to) {
        window.location.href = to
      }
    }, 100)
    
    setTimeout(() => {
      if (window.location.pathname !== to) {
        window.location.href = to
      }
    }, 500)
  }
  
  return null
}
