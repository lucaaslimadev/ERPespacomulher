'use client'

import { Button } from './Button'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
