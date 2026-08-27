'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { X, CheckCircle } from 'lucide-react'

interface CompleteConsignmentModalProps {
  consignment: any
  onClose: () => void
  onSuccess: () => void
}

export function CompleteConsignmentModal({ consignment, onClose, onSuccess }: CompleteConsignmentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO')
  const [loading, setLoading] = useState(false)

  const soldItems = consignment.items
    .map((item: any) => ({
      ...item,
      soldQuantity: item.quantity - item.returned,
    }))
    .filter((item: any) => item.soldQuantity > 0)

  const total = soldItems.reduce((sum: number, item: any) => 
    sum + (parseFloat(item.unitPrice) * item.soldQuantity), 0
  )

  const handleSubmit = async () => {
    if (soldItems.length === 0) {
      toast.error('Nenhum item foi vendido (todos foram devolvidos)')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch(`/api/consignments/${consignment.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao finalizar consignado')
        return
      }

      toast.success('Consignado finalizado! Venda gerada com sucesso.')
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao finalizar consignado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Finalizar Consignado</h2>
            <p className="text-sm text-gray-600">Cliente: {consignment.customer.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium">Itens Vendidos</h3>
            </div>
            <div className="space-y-2">
              {soldItems.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} - {item.variation.color} {item.variation.size} x{item.soldQuantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(item.unitPrice) * item.soldQuantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {consignment.items.some((item: any) => item.returned > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Itens Devolvidos</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {consignment.items
                  .filter((item: any) => item.returned > 0)
                  .map((item: any) => (
                    <div key={item.id}>
                      {item.product.name} - {item.variation.color} {item.variation.size} x{item.returned}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de Pagamento *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input"
            >
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CREDITO_AVISTA">Crédito à Vista</option>
              <option value="DEBITO">Débito</option>
            </select>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total da Venda:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao finalizar, uma venda será gerada automaticamente com os itens vendidos
              e o consignado será marcado como concluído. Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading || soldItems.length === 0}
            >
              {loading ? 'Finalizando...' : 'Finalizar e Gerar Venda'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
