'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { X, Plus, Trash2 } from 'lucide-react'

interface NewConsignmentModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function NewConsignmentModal({ onClose, onSuccess }: NewConsignmentModalProps) {
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [searchProduct, setSearchProduct] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCustomers()
    loadProducts()
  }, [])

  const loadCustomers = async () => {
    try {
      const response = await apiFetch('/api/customers')
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await apiFetch('/api/products')
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const addItem = (product: any, variation: any) => {
    const exists = selectedItems.find(i => i.variationId === variation.id)
    if (exists) {
      setSelectedItems(selectedItems.map(item =>
        item.variationId === variation.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        variationId: variation.id,
        productName: product.name,
        color: variation.color,
        size: variation.size,
        quantity: 1,
        unitPrice: parseFloat(product.price.toString()),
      }])
    }
  }

  const removeItem = (variationId: string) => {
    setSelectedItems(selectedItems.filter(item => item.variationId !== variationId))
  }

  const updateQuantity = (variationId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.variationId === variationId ? { ...item, quantity: Math.max(1, quantity) } : item
    ))
  }

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Selecione um cliente')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um item')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items: selectedItems,
          notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao criar consignado')
        return
      }

      toast.success('Consignado criado com sucesso')
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao criar consignado')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) && p.active
  )

  const total = selectedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Novo Consignado</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input"
            >
              <option value="">Selecione um cliente</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Buscar Produtos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Produtos</label>
            <Input
              placeholder="Buscar produto..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
            />
            <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
              {filteredProducts.map(product => (
                <div key={product.id} className="border rounded-lg p-3">
                  <p className="font-medium mb-2">{product.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.filter((v: any) => v.quantity > 0).map((variation: any) => (
                      <button
                        key={variation.id}
                        onClick={() => addItem(product, variation)}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                      >
                        {variation.color} - {variation.size} ({variation.quantity})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Itens Selecionados */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">Itens Selecionados</h3>
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.variationId} className="flex items-center gap-3 bg-white p-2 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-600">{item.color} - {item.size}</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.variationId, parseInt(e.target.value) || 1)}
                      className="w-16 text-sm"
                    />
                    <p className="text-sm font-medium w-24 text-right">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(item.variationId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="font-bold">Total:</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Observações sobre o consignado..."
            />
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading || !customerId || selectedItems.length === 0}
            >
              {loading ? 'Criando...' : 'Criar Consignado'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
