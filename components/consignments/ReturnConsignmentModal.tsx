'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { X } from 'lucide-react'

interface ReturnConsignmentModalProps {
  consignment: any
  onClose: () => void
  onSuccess: () => void
}

export function ReturnConsignmentModal({ consignment, onClose, onSuccess }: ReturnConsignmentModalProps) {
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>(
    consignment.items.reduce((acc: any, item: any) => {
      acc[item.id] = 0
      return acc
    }, {})
  )
  const [loading, setLoading] = useState(false)

  const updateReturn = (itemId: string, quantity: number, maxQuantity: number) => {
    setReturnItems({
      ...returnItems,
      [itemId]: Math.max(0, Math.min(quantity, maxQuantity)),
    })
  }

  const handleSubmit = async () => {
    const items = Object.entries(returnItems)
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemId, returnedQuantity]) => ({
        itemId,
        returnedQuantity,
      }))

    if (items.length === 0) {
      toast.error('Selecione pelo menos um item para devolver')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch(`/api/consignments/${consignment.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao registrar retorno')
        return
      }

      toast.success('Retorno registrado com sucesso')
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao registrar retorno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Registrar Retorno</h2>
            <p className="text-sm text-gray-600">Cliente: {consignment.customer.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Informe a quantidade de cada item que foi devolvido pelo cliente:
          </p>

          {consignment.items.map((item: any) => {
            const notReturned = item.quantity - item.returned
            if (notReturned === 0) return null

            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.variation.color} - {item.variation.size}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Enviado: {item.quantity} | Já devolvido: {item.returned} | Disponível: {notReturned}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(parseFloat(item.unitPrice))}</p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Devolver:</label>
                  <Input
                    type="number"
                    min="0"
                    max={notReturned}
                    value={returnItems[item.id] || 0}
                    onChange={(e) => updateReturn(item.id, parseInt(e.target.value) || 0, notReturned)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">de {notReturned} disponíveis</span>
                </div>
              </div>
            )
          })}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">Resumo</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total de itens devolvidos:</span>
                <span className="font-medium">
                  {Object.values(returnItems).reduce((sum: number, qty: number) => sum + qty, 0)} peças
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading || Object.values(returnItems).every(qty => qty === 0)}
            >
              {loading ? 'Registrando...' : 'Registrar Retorno'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
