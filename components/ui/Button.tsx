import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'btn inline-flex items-center justify-center gap-2',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'danger' && 'btn-danger',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
