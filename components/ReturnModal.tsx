'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { X, Package, ArrowRight, DollarSign } from 'lucide-react'

interface ReturnModalProps {
  sale: any
  onClose: () => void
  onSuccess: () => void
}

export function ReturnModal({ sale, onClose, onSuccess }: ReturnModalProps) {
  const [returnType, setReturnType] = useState<'DEVOLUCAO' | 'TROCA'>('DEVOLUCAO')
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [exchangeItems, setExchangeItems] = useState<any[]>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [searchProduct, setSearchProduct] = useState('')

  useEffect(() => {
    if (returnType === 'TROCA') {
      loadProducts()
    }
  }, [returnType])

  const loadProducts = async () => {
    try {
      const response = await apiFetch('/api/products')
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const toggleItem = (item: any) => {
    const exists = selectedItems.find(i => i.id === item.id)
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id))
    } else {
      setSelectedItems([...selectedItems, { ...item, returnQuantity: item.quantity }])
    }
  }

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, returnQuantity: Math.min(quantity, item.quantity) } : item
    ))
  }

  const addExchangeItem = (product: any, variation: any) => {
    const exists = exchangeItems.find(i => i.variationId === variation.id)
    if (exists) {
      setExchangeItems(exchangeItems.map(item =>
        item.variationId === variation.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setExchangeItems([...exchangeItems, {
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

  const removeExchangeItem = (variationId: string) => {
    setExchangeItems(exchangeItems.filter(item => item.variationId !== variationId))
  }

  const updateExchangeQuantity = (variationId: string, quantity: number) => {
    setExchangeItems(exchangeItems.map(item =>
      item.variationId === variationId ? { ...item, quantity: Math.max(1, quantity) } : item
    ))
  }

  const refundAmount = selectedItems.reduce((sum, item) => 
    sum + (parseFloat(item.unitPrice.toString()) * item.returnQuantity), 0
  )

  const exchangeAmount = exchangeItems.reduce((sum, item) => 
    sum + (item.unitPrice * item.quantity), 0
  )

  const difference = exchangeAmount - refundAmount

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos um item para devolver')
      return
    }

    if (returnType === 'TROCA' && exchangeItems.length === 0) {
      toast.error('Adicione pelo menos um produto para troca')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale.id,
          type: returnType,
          reason,
          items: selectedItems.map(item => ({
            saleItemId: item.id,
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.returnQuantity,
            unitPrice: parseFloat(item.unitPrice.toString()),
          })),
          exchangeItems: returnType === 'TROCA' ? exchangeItems : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao processar devolução/troca')
        return
      }

      toast.success(data.message || 'Processado com sucesso')
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao processar devolução/troca')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Troca e Devolução</h2>
            <p className="text-sm text-gray-600">Venda #{sale.id.substring(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tipo de Operação */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Operação</label>
          <div className="flex gap-4">
            <button
              onClick={() => setReturnType('DEVOLUCAO')}
              className={`flex-1 p-4 border-2 rounded-lg transition ${
                returnType === 'DEVOLUCAO'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">Devolução</p>
              <p className="text-xs text-gray-600">Cliente recebe reembolso</p>
            </button>
            <button
              onClick={() => setReturnType('TROCA')}
              className={`flex-1 p-4 border-2 rounded-lg transition ${
                returnType === 'TROCA'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ArrowRight className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">Troca</p>
              <p className="text-xs text-gray-600">Trocar por outros produtos</p>
            </button>
          </div>
        </div>

        {/* Itens da Venda */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">Selecione os itens para {returnType === 'DEVOLUCAO' ? 'devolver' : 'trocar'}</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sale.items.map((item: any) => {
              const selected = selectedItems.find(i => i.id === item.id)
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => toggleItem(item)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.variation.color} - {item.variation.size}
                    </p>
                  </div>
                  {selected && (
                    <Input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={selected.returnQuantity}
                      onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  )}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Qtd: {item.quantity}</p>
                    <p className="font-medium">{formatCurrency(parseFloat(item.unitPrice.toString()))}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Produtos para Troca */}
        {returnType === 'TROCA' && (
          <div className="mb-6">
            <h3 className="font-bold mb-3">Novos Produtos (Troca)</h3>
            <Input
              placeholder="Buscar produto..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {filteredProducts.map((product: any) => (
                <div key={product.id} className="border rounded-lg p-3">
                  <p className="font-medium mb-2">{product.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.map((variation: any) => (
                      <button
                        key={variation.id}
                        onClick={() => addExchangeItem(product, variation)}
                        disabled={variation.quantity === 0}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {variation.color} - {variation.size} ({variation.quantity})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Itens Selecionados para Troca */}
            {exchangeItems.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Itens Selecionados</h4>
                <div className="space-y-2">
                  {exchangeItems.map((item) => (
                    <div key={item.variationId} className="flex items-center gap-3 bg-white p-2 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-gray-600">{item.color} - {item.size}</p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateExchangeQuantity(item.variationId, parseInt(e.target.value) || 1)}
                        className="w-16 text-sm"
                      />
                      <p className="text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <button
                        onClick={() => removeExchangeItem(item.variationId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Motivo (opcional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            rows={3}
            placeholder="Descreva o motivo da devolução/troca..."
          />
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-3">Resumo Financeiro</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Valor a devolver:</span>
              <span className="font-medium text-red-600">-{formatCurrency(refundAmount)}</span>
            </div>
            {returnType === 'TROCA' && (
              <>
                <div className="flex justify-between">
                  <span>Valor dos novos produtos:</span>
                  <span className="font-medium text-green-600">+{formatCurrency(exchangeAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Diferença:</span>
                  <span className={difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
                {difference > 0 && (
                  <p className="text-sm text-gray-600">Cliente deve pagar a diferença</p>
                )}
                {difference < 0 && (
                  <p className="text-sm text-gray-600">Devolver diferença ao cliente</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1"
            disabled={loading || selectedItems.length === 0}
          >
            {loading ? 'Processando...' : `Confirmar ${returnType === 'DEVOLUCAO' ? 'Devolução' : 'Troca'}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
