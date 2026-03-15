'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatCurrency, escapeHtml } from '@/lib/utils'
import { printHTML } from '@/lib/print-utils'
import { apiFetch } from '@/lib/api'
import { PaymentMethod, CartItem } from '@/types'
import { Search, Plus, Minus, X, ShoppingBag, UserPlus, Printer } from 'lucide-react'

export default function PDVPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO')
  const [creditType, setCreditType] = useState<'avista' | 'parcelado'>('avista')
  const [installments, setInstallments] = useState(1)
  const [mixedPayments, setMixedPayments] = useState<Array<{
    method: PaymentMethod
    amount: number
    installments?: number
  }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const searchIdRef = useRef(0)

  // Focar no campo de busca ao carregar (para leitor de código de barras)
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Busca inteligente (em tempo real) - usa searchIdRef para ignorar respostas obsoletas
  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setProducts([])
      return
    }

    const id = ++searchIdRef.current
    try {
      const response = await apiFetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&smart=true`)
      const data = await response.json()
      if (id !== searchIdRef.current) return
      if (data.products && data.products.length > 0) {
        setProducts(data.products)
      } else {
        setProducts([])
      }
    } catch (error) {
      if (id !== searchIdRef.current) return
      console.error('Erro na busca inteligente:', error)
    }
  }, [searchQuery])

  // Definir addToCart antes de ser usado
  const addToCart = useCallback((product: any, variation: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(
        item => item.variationId === variation.id
      )

      if (existingItem) {
        if (existingItem.quantity >= variation.quantity) {
          toast.error('Estoque insuficiente')
          return prevCart
        }
        return prevCart.map(item =>
          item.variationId === variation.id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        )
      } else {
        const unitPrice = parseFloat(product.price.toString())
        return [...prevCart, {
          productId: product.id,
          variationId: variation.id,
          productName: product.name,
          color: variation.color,
          size: variation.size,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
        }]
      }
    })
  }, [])

  // Busca inteligente em tempo real (debounce)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setProducts([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSmartSearch()
    }, 300) // Aguardar 300ms após parar de digitar

    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSmartSearch])

  // Buscar produtos (busca manual com Enter)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await apiFetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&smart=true`)
      const data = await response.json()
      
      if (data.products && data.products.length === 0) {
        // Se não encontrou nada, tentar busca normal
        const normalResponse = await apiFetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`)
        const normalData = await normalResponse.json()
        
        if (normalData.products && normalData.products.length === 0) {
          toast.error('Nenhum produto encontrado')
          setSearchQuery('')
          searchInputRef.current?.focus()
          return
        }
        
        setProducts(normalData.products || [])
        return
      }

      // Se encontrou apenas 1 produto
      if (data.products.length === 1) {
        const product = data.products[0]
        
        // Se tem apenas 1 variação com estoque, adicionar direto (código de barras)
        const availableVariations = product.variations.filter((v: any) => v.quantity > 0)
        if (availableVariations.length === 1) {
          addToCart(product, availableVariations[0])
          setSearchQuery('')
          setProducts([])
          searchInputRef.current?.focus()
          return
        }
        
        // Se tem múltiplas variações, mostrar modal para escolher
        if (availableVariations.length > 1) {
          setSelectedProduct(product)
          setShowVariationModal(true)
          setSearchQuery('')
          setProducts([])
          return
        }
        
        // Se não tem variações com estoque
        toast.error('Produto sem estoque disponível')
        setSearchQuery('')
        setProducts([])
        searchInputRef.current?.focus()
        return
      }

      // Se encontrou múltiplos produtos, mostrar lista para escolher
      if (data.products.length > 1) {
        setProducts(data.products)
        // Não limpar o campo de busca para permitir refinar a busca
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      toast.error('Erro ao buscar produto')
    }
  }, [searchQuery, addToCart])

  const removeFromCart = (variationId: string) => {
    setCart(cart.filter(item => item.variationId !== variationId))
  }

  const updateQuantity = (variationId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.variationId === variationId) {
        const newQuantity = item.quantity + delta
        if (newQuantity <= 0) {
          return null
        }
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice,
        }
      }
      return item
    }).filter(Boolean) as CartItem[])
  }

  const printReceipt = async (saleId: string) => {
    try {
      const response = await apiFetch(`/api/sales/${saleId}/receipt`)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as { error?: string }
        toast.error(errData.error || 'Erro ao gerar cupom')
        return
      }
      const data = await response.json()
      const sale = data.sale
      const esc = escapeHtml

      const paymentLabel =
        sale.paymentMethod === 'CREDITO_PARCELADO' && sale.installments?.length
          ? `Credito Parcelado (${sale.installments.length}x)`
          : sale.paymentMethod === 'CREDITO_AVISTA'
            ? 'Credito a Vista'
            : String(sale.paymentMethod || '')

      const itemsHtml = (sale.items || []).map((item: any) => `<div class="item">
  <div class="item-name">${esc(String(item.product?.name || ''))}</div>
  <div class="item-details">${esc(String(item.variation?.color || ''))} - ${esc(String(item.variation?.size || ''))} | ${item.quantity}x R$ ${parseFloat(item.unitPrice.toString()).toFixed(2)}</div>
  <div style="text-align:right;margin-top:2px">R$ ${parseFloat(item.totalPrice.toString()).toFixed(2)}</div>
</div>`).join('')

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cupom</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:58mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;font-size:12px;padding:5px}
.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px}
.header h1{font-size:14px;font-weight:bold;margin:0}
.info p{margin:2px 0}
.items{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin:8px 0}
.item{margin:4px 0}
.item-name{font-weight:bold}
.item-details{font-size:10px;color:#444}
.total-line{display:flex;justify-content:space-between;margin:3px 0}
.total-final{font-weight:bold;font-size:14px;border-top:1px solid #000;padding-top:4px;margin-top:4px}
.footer{text-align:center;margin-top:15px;padding-top:8px;border-top:1px dashed #000;font-size:10px}
</style></head><body>
<div class="header">
  <h1>Espaco Mulher</h1>
  <p>Cupom de Venda</p>
</div>
<div class="info">
  <p><strong>Venda:</strong> #${esc(String(sale.id || '').substring(0, 8))}</p>
  <p><strong>Data:</strong> ${new Date(sale.createdAt).toLocaleString('pt-BR')}</p>
  <p><strong>Forma:</strong> ${esc(paymentLabel)}</p>
  ${sale.customer ? `<p><strong>Cliente:</strong> ${esc(String(sale.customer.name || ''))}</p>` : ''}
  <p><strong>Vendedor:</strong> ${esc(String(sale.user?.name || ''))}</p>
</div>
<div class="items">
  ${itemsHtml}
</div>
<div class="totals">
  <div class="total-line"><span>Subtotal:</span><span>R$ ${parseFloat(sale.subtotal.toString()).toFixed(2)}</span></div>
  ${parseFloat(sale.discount.toString()) > 0 ? `<div class="total-line"><span>Desconto:</span><span>-R$ ${parseFloat(sale.discount.toString()).toFixed(2)}</span></div>` : ''}
  <div class="total-line total-final"><span>TOTAL:</span><span>R$ ${parseFloat(sale.total.toString()).toFixed(2)}</span></div>
  ${sale.installments?.length > 0 ? `<div class="total-line" style="margin-top:6px;padding-top:6px;border-top:1px dashed #ccc"><span style="font-size:0.9em">Parcelado em ${sale.installments.length}x</span><span style="font-size:0.9em">R$ ${(parseFloat(sale.total.toString()) / sale.installments.length).toFixed(2)}</span></div>` : ''}
</div>
<div class="footer">
  <p>Obrigado pela preferencia!</p>
  <p>${new Date().toLocaleString('pt-BR')}</p>
</div>
</body></html>`

      printHTML(html)
    } catch (error) {
      console.error('Erro ao imprimir cupom:', error)
      toast.error('Erro ao imprimir cupom')
    }
  }

  // Subtotal bruto (antes de desconto)
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  
  // Desconto calculado
  const finalDiscount = discountType === 'percent' 
    ? (subtotal * discount) / 100 
    : discount
  
  const subtotalAfterDiscount = Math.max(0, subtotal - finalDiscount)
  const total = subtotalAfterDiscount

  const handleFinalizeSale = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho')
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    try {
      const finalPaymentMethod = paymentMethod

      // Determinar número de parcelas
      const finalInstallments = (paymentMethod === 'CREDITO_PARCELADO' && installments > 1) 
        ? installments 
        : null

      // Preparar pagamentos mistos se aplicável
      const mixedPaymentsData = paymentMethod === 'MISTO' && mixedPayments.length > 0
        ? mixedPayments.map(p => ({
            method: p.method,
            amount: p.amount,
            installments: p.installments || null,
          }))
        : null

      // Validar pagamento misto
      if (paymentMethod === 'MISTO') {
        const totalMixed = mixedPayments.reduce((sum, p) => sum + p.amount, 0)
        if (Math.abs(totalMixed - total) > 0.01) {
          toast.error(`O total dos pagamentos (${formatCurrency(totalMixed)}) deve ser igual ao total da venda (${formatCurrency(total)})`)
          setLoading(false)
          return
        }
        if (mixedPayments.length === 0) {
          toast.error('Adicione pelo menos um método de pagamento')
          setLoading(false)
          return
        }
      }

      const payload = {
        customerId: customer?.id || null,
        items: cart.map(item => ({
          productId: item.productId,
          variationId: item.variationId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(finalDiscount.toFixed(2)),
        total: Number(total.toFixed(2)),
        paymentMethod: finalPaymentMethod,
        installments: finalInstallments,
        mixedPayments: mixedPaymentsData,
      }

      const response = await apiFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as { error?: string; details?: string }
        const msg = errData?.error || errData?.details || 'Erro ao finalizar venda'
        toast.error(msg)
        return
      }

      const data = await response.json()

      submittingRef.current = false
      // Perguntar se deseja imprimir o cupom
      toast.success('Venda finalizada com sucesso!')
      const shouldPrint = window.confirm('Deseja imprimir o cupom?')
      
      if (shouldPrint && data.sale?.id) {
        printReceipt(data.sale.id)
      }

      // Limpar carrinho e resetar
      setCart([])
      setCustomer(null)
      setDiscount(0)
      setPaymentMethod('DINHEIRO')
      setCreditType('avista')
      setInstallments(1)
      setSearchQuery('')
      searchInputRef.current?.focus()
    } catch (error) {
      console.error('Erro ao finalizar venda:', error)
      toast.error('Erro ao finalizar venda')
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }, [cart, customer, discount, discountType, paymentMethod, mixedPayments, installments, total])

  // Atalhos de teclado (depois de definir as funções)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Permitir apenas alguns atalhos quando digitando
        if (e.key === 'Escape' || (e.ctrlKey && e.key === 'd')) {
          // Continuar
        } else {
          return
        }
      }

      // Esc para limpar busca ou fechar modais
      if (e.key === 'Escape') {
        if (showCustomerModal) {
          setShowCustomerModal(false)
          return
        }
        if (showVariationModal) {
          setShowVariationModal(false)
          setSelectedProduct(null)
          return
        }
        if (products.length > 0) {
          setProducts([])
          return
        }
        searchInputRef.current?.focus()
        return
      }

      // Ctrl+D para desconto
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        const discountInput = document.querySelector('input[type="number"]') as HTMLInputElement
        if (discountInput && discountInput.placeholder?.toLowerCase().includes('desconto')) {
          discountInput.focus()
          discountInput.select()
        }
        return
      }

      // F1-F5 para formas de pagamento
      if (e.key.startsWith('F') && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        const fKey = parseInt(e.key.substring(1))
        if (fKey >= 1 && fKey <= 5) {
          e.preventDefault()
          const methods: PaymentMethod[] = ['DINHEIRO', 'PIX', 'CREDITO_AVISTA', 'CREDITO_PARCELADO', 'DEBITO', 'MISTO']
          if (methods[fKey - 1]) {
            setPaymentMethod(methods[fKey - 1])
          }
        }
      }

      // F9 para finalizar venda
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length > 0 && !loading) {
          handleFinalizeSale()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, loading, showCustomerModal, showVariationModal, products.length, handleFinalizeSale, handleSearch, addToCart])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">PDV - Ponto de Venda</h1>
        <p className="text-gray-600 mt-1">Sistema de vendas rápido e eficiente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área principal - Busca e Carrinho */}
        <div className="lg:col-span-2 space-y-6">
          {/* Busca de produtos */}
          <Card>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  ref={searchInputRef}
                  placeholder="Digite o nome do produto (busca inteligente)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // Limpar produtos se campo estiver vazio
                    if (!e.target.value.trim()) {
                      setProducts([])
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  onKeyDown={(e) => {
                    // Esc para limpar busca
                    if (e.key === 'Escape') {
                      setSearchQuery('')
                      setProducts([])
                      searchInputRef.current?.focus()
                    }
                  }}
                  autoFocus
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Lista de produtos encontrados (busca inteligente) */}
            {products.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    {products.length} produto(s) encontrado(s)
                  </p>
                  <button
                    onClick={() => {
                      setProducts([])
                      setSearchQuery('')
                      searchInputRef.current?.focus()
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpar
                  </button>
                </div>
                {products.map((product) => {
                  const availableVariations = product.variations.filter((v: any) => v.quantity > 0)
                  if (availableVariations.length === 0) return null
                  
                  return (
                    <div
                      key={product.id}
                      className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm font-semibold text-primary-600 mt-1">
                            {formatCurrency(parseFloat(product.price.toString()))}
                          </p>
                        </div>
                      </div>
                      
                      {/* Variações disponíveis */}
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Variações disponíveis:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {availableVariations.map((variation: any) => (
                            <button
                              key={variation.id}
                              onClick={() => {
                                addToCart(product, variation)
                                setProducts([])
                                setSearchQuery('')
                                searchInputRef.current?.focus()
                              }}
                              className="p-2 text-xs bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded transition-colors text-left"
                              title={`${variation.color} ${variation.size} - Estoque: ${variation.quantity}`}
                            >
                              <div className="font-medium text-gray-900">
                                {variation.color}
                              </div>
                              <div className="text-gray-600">
                                {variation.size}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                Est: {variation.quantity}
                              </div>
                            </button>
                          ))}
                        </div>
                        {availableVariations.length > 6 && (
                          <button
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowVariationModal(true)
                              setProducts([])
                              setSearchQuery('')
                            }}
                            className="w-full mt-2 p-2 text-xs text-primary-600 hover:bg-primary-50 rounded border border-primary-200"
                          >
                            Ver todas as {availableVariations.length} variações
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Cliente */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="font-medium">
                  {customer ? customer.name : 'Cliente não identificado'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowCustomerModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {customer ? 'Alterar' : 'Adicionar'}
              </Button>
            </div>
          </Card>

          {/* Carrinho */}
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Carrinho ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum produto no carrinho. Use o campo de busca acima para adicionar produtos.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.variationId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-600">
                        {item.color} - {item.size}
                      </p>
                      <p className="text-sm font-medium text-primary-600">
                        {formatCurrency(item.unitPrice)} x {item.quantity} = {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.variationId, -1)}
                        className="p-1 text-gray-600 hover:text-gray-900"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variationId, 1)}
                        className="p-1 text-gray-600 hover:text-gray-900"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.variationId)}
                        className="p-1 text-red-600 hover:text-red-800 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Painel lateral - Resumo e Finalização */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">Resumo da Venda</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="border-t pt-3">
                <div className="mb-2">
                  <label className="block text-sm text-gray-600 mb-1">Desconto</label>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as 'percent' | 'fixed')
                        setDiscount(0)
                      }}
                      className="input text-sm"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">R$</option>
                    </select>
                    <Input
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="flex-1"
                      placeholder="Desconto"
                    />
                  </div>
                  {discount > 0 && (
                    <p className="text-sm text-gray-600">
                      Desconto: {formatCurrency(finalDiscount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total da Venda:</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
                {creditType === 'parcelado' && installments > 1 && (
                  <p className="text-sm text-gray-600 mt-1 text-right">
                    {installments}x de {formatCurrency(total / installments)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Forma de Pagamento</h2>
            <div className="space-y-2">
              {(['DINHEIRO', 'PIX', 'CREDITO_AVISTA', 'CREDITO_PARCELADO', 'DEBITO', 'MISTO'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method)
                    if (method === 'CREDITO_AVISTA') {
                      setCreditType('avista')
                      setInstallments(1)
                      setMixedPayments([])
                    } else if (method === 'CREDITO_PARCELADO') {
                      setCreditType('parcelado')
                      setInstallments(2)
                      setMixedPayments([])
                    } else if (method === 'MISTO') {
                      setMixedPayments([])
                    } else {
                      setCreditType('avista')
                      setInstallments(1)
                      setMixedPayments([])
                    }
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === method
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method === 'CREDITO_AVISTA' ? 'CRÉDITO À VISTA' : 
                   method === 'CREDITO_PARCELADO' ? 'CRÉDITO PARCELADO' : 
                   method}
                </button>
              ))}
            </div>

            {/* Opções de Crédito Parcelado */}
            {paymentMethod === 'CREDITO_PARCELADO' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Crédito
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setCreditType('avista')
                        setInstallments(1)
                      }}
                      className={`p-2 rounded border-2 ${
                        creditType === 'avista'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200'
                      }`}
                    >
                      À Vista
                    </button>
                    <button
                      onClick={() => setCreditType('parcelado')}
                      className={`p-2 rounded border-2 ${
                        creditType === 'parcelado'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200'
                      }`}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>

                {creditType === 'parcelado' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Parcelas
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={num}>
                          {num}x
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Pagamento Misto */}
            {paymentMethod === 'MISTO' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <h3 className="font-medium text-gray-700">Divisão do Pagamento</h3>
                <div className="space-y-2">
                  {mixedPayments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {payment.method === 'CREDITO_AVISTA' ? 'Crédito à Vista' :
                           payment.method === 'CREDITO_PARCELADO' ? `Crédito Parcelado (${payment.installments}x)` :
                           payment.method}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(payment.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newPayments = mixedPayments.filter((_, i) => i !== index)
                          setMixedPayments(newPayments)
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="text-sm text-gray-600 mb-2">
                    Total já dividido: {formatCurrency(mixedPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </div>
                  <div className="text-sm font-medium mb-2">
                    Restante: {formatCurrency(total - mixedPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </div>
                  
                  <MixedPaymentForm
                    remaining={total - mixedPayments.reduce((sum, p) => sum + p.amount, 0)}
                    onAdd={(payment) => {
                      setMixedPayments([...mixedPayments, payment])
                    }}
                  />
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-2">
            <Button
              onClick={handleFinalizeSale}
              disabled={cart.length === 0 || loading}
              className="w-full py-4 text-lg"
            >
              {loading ? 'Processando...' : 'Finalizar Venda (F9)'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Atalhos: Enter (buscar) | F1-F5 (pagamento) | Ctrl+D (desconto) | Esc (cancelar)
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Cliente */}
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={(customer) => {
            setCustomer(customer)
            setShowCustomerModal(false)
          }}
        />
      )}

      {/* Modal de Seleção de Variação */}
      {showVariationModal && selectedProduct && (
        <VariationModal
          product={selectedProduct}
          onClose={() => {
            setShowVariationModal(false)
            setSelectedProduct(null)
            searchInputRef.current?.focus()
          }}
          onSelect={(variation) => {
            addToCart(selectedProduct, variation)
            setShowVariationModal(false)
            setSelectedProduct(null)
            searchInputRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function VariationModal({ product, onClose, onSelect }: { product: any; onClose: () => void; onSelect: (variation: any) => void }) {
  const availableVariations = product.variations.filter((v: any) => v.quantity > 0)
  
  // Agrupar por cor
  const groupedByColor: Record<string, any[]> = {}
  availableVariations.forEach((v: any) => {
    if (!groupedByColor[v.color]) {
      groupedByColor[v.color] = []
    }
    groupedByColor[v.color].push(v)
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-lg font-medium text-primary-600 mt-1">
              {formatCurrency(parseFloat(product.price.toString()))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Selecione a variação (Cor + Tamanho):
          </p>
        </div>

        {availableVariations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma variação com estoque disponível</p>
            <Button onClick={onClose} className="mt-4">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByColor).map(([color, variations]) => (
              <div key={color} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3 text-gray-800">
                  Cor: {color}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {variations.map((variation) => (
                    <button
                      key={variation.id}
                      onClick={() => onSelect(variation)}
                      className="p-3 border-2 border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors text-center"
                    >
                      <p className="font-medium text-sm">{variation.size}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Estoque: {variation.quantity}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

function CustomerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (customer: any) => void }) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })

  const searchCustomers = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const response = await apiFetch(`/api/customers?search=${encodeURIComponent(search)}`)
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!newCustomer.phone.trim()) {
      toast.error('Telefone é obrigatório')
      return
    }
    setLoading(true)
    try {
      const response = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || null,
        }),
      })
      const data = await response.json()
      if (data.customer) {
        onSelect(data.customer)
        setNewCustomer({ name: '', phone: '', email: '' })
      } else if (data.error) {
        toast.error(data.error || 'Erro ao criar cliente')
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      toast.error('Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Buscar ou Cadastrar Cliente</h2>

        <div className="space-y-4">
          <div>
            <Input
              label="Buscar cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
              placeholder="Nome, telefone ou email"
            />
            <Button onClick={searchCustomers} className="mt-2 w-full" disabled={loading}>
              Buscar
            </Button>
          </div>

          {customers.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Resultados:</p>
              <div className="space-y-2">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <p className="font-medium">{customer.name}</p>
                    {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Cadastrar novo cliente:</p>
            <div className="space-y-2">
              <Input
                label="Nome *"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
              <Input
                label="Telefone *"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                required
              />
              <Input
                label="Email (opcional)"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
              <Button onClick={createCustomer} className="w-full" disabled={loading}>
                Cadastrar
              </Button>
            </div>
          </div>
        </div>

        <Button variant="secondary" onClick={onClose} className="mt-4 w-full">
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// Componente para adicionar método de pagamento no pagamento misto
function MixedPaymentForm({ 
  remaining, 
  onAdd,
}: { 
  remaining: number
  onAdd: (payment: { method: PaymentMethod; amount: number; installments?: number }) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('DINHEIRO')
  const [amount, setAmount] = useState(remaining)
  const [installments, setInstallments] = useState(2)
  const [showInstallments, setShowInstallments] = useState(false)

  useEffect(() => {
    setAmount(remaining)
  }, [remaining])

  useEffect(() => {
    if (method === 'CREDITO_PARCELADO') {
      setShowInstallments(true)
    } else {
      setShowInstallments(false)
    }
  }, [method])

  const handleAdd = () => {
    if (amount <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }
    if (amount > remaining) {
      toast.error(`Valor não pode ser maior que o restante (${formatCurrency(remaining)})`)
      return
    }

    onAdd({
      method,
      amount,
      installments: showInstallments ? installments : undefined,
    })

    setAmount(remaining - amount)
  }

  return (
    <div className="space-y-2 p-3 bg-white rounded border">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Método</label>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as PaymentMethod)
          }}
          className="w-full p-2 text-sm border border-gray-300 rounded"
        >
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="CREDITO_AVISTA">Crédito à Vista</option>
          <option value="CREDITO_PARCELADO">Crédito Parcelado</option>
          <option value="DEBITO">Débito</option>
        </select>
      </div>

      {showInstallments && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Parcelas</label>
          <select
            value={installments}
            onChange={(e) => setInstallments(parseInt(e.target.value))}
            className="w-full p-2 text-sm border border-gray-300 rounded"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
              <option key={num} value={num}>{num}x</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={remaining}
          value={amount || ''}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          onFocus={(e) => e.target.select()}
          className="w-full p-2 text-sm border border-gray-300 rounded"
          placeholder="Digite o valor"
        />
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        className="w-full text-sm"
        disabled={amount <= 0 || amount > remaining}
      >
        Adicionar
      </Button>
    </div>
  )
}
