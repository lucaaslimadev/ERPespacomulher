'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Search, Edit, Package, Printer, Trash2 } from 'lucide-react'

const LabelPrintModal = dynamic(() => import('@/components/labels/LabelPrintModal').then(m => ({ default: m.LabelPrintModal })), { ssr: false })

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const isFirstSearchRef = useRef(true)

  const doLoad = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.append('search', search.trim())
      const response = await apiFetch(`/api/products?${params}`)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = isFirstSearchRef.current ? 0 : 400
    isFirstSearchRef.current = false
    const id = setTimeout(doLoad, delay)
    return () => clearTimeout(id)
  }, [search])

  const totalStock = (variations: any[]) => {
    return variations.reduce((sum, v) => sum + v.quantity, 0)
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/products/${deleteTargetId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir produto')
        return
      }
      setDeleteTargetId(null)
      doLoad()
      toast.success('Produto excluído.')
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      toast.error('Erro ao excluir produto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de produtos e estoque</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => {
              if (products.length === 0) {
                toast('Nenhum produto na lista. Busque ou cadastre produtos primeiro.')
                return
              }
              setShowLabelModal(true)
            }}
            title="Etiquetas com código de barras para impressora térmica"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Etiquetas
          </Button>
          <Button onClick={() => { setSelectedProduct(null); setShowModal(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => doLoad()}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-center py-8 text-gray-500">Carregando...</p>
      ) : products.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-gray-500">Nenhum produto encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedProduct(product)
                      setShowModal(true)
                    }}
                    className="p-1 text-gray-600 hover:text-primary-600"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(product.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(product.price.toString()))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Custo:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(product.cost.toString()))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estoque Total:</span>
                  <span className="font-medium">{totalStock(product.variations)}</span>
                </div>
                {product.barcode && (
                  <div className="text-xs text-gray-500">
                    Código: {product.barcode}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-600 mb-2">Variações:</p>
                <div className="space-y-1">
                  {product.variations.slice(0, 3).map((v: any) => (
                    <div key={v.id} className="flex justify-between text-xs">
                      <span>{v.color} - {v.size}</span>
                      <span className={v.quantity <= product.lowStockAlert ? 'text-red-600 font-medium' : ''}>
                        {v.quantity}
                      </span>
                    </div>
                  ))}
                  {product.variations.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{product.variations.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showLabelModal && products.length > 0 && (
        <LabelPrintModal
          products={products}
          onClose={() => setShowLabelModal(false)}
        />
      )}

      {showModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowModal(false)
            setSelectedProduct(null)
          }}
          onSave={() => {
            doLoad()
            setShowModal(false)
            setSelectedProduct(null)
          }}
        />
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir produto"
        message="Tem certeza que deseja excluir este produto? Produtos com vendas associadas não podem ser excluídos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function ProductModal({ product, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product ? parseFloat(product.price.toString()) : 0,
    cost: product ? parseFloat(product.cost.toString()) : 0,
    barcode: product?.barcode || '',
    sku: product?.sku || '',
    lowStockAlert: product?.lowStockAlert || 5,
  })
  
  const [variations, setVariations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Carregar variações quando o produto mudar
  useEffect(() => {
    if (product?.variations) {
      setVariations(product.variations.map((v: any) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        quantity: v.quantity,
      })))
    } else {
      setVariations([])
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'

      // Buscar ou criar categoria padrão "Geral"
      let categoryId = ''
      try {
        const categoriesRes = await apiFetch('/api/categories')
        const categoriesData = await categoriesRes.json()
        const geralCategory = categoriesData.categories?.find((c: any) => c.name === 'Geral')
        
        if (geralCategory) {
          categoryId = geralCategory.id
        } else {
          // Criar categoria "Geral" se não existir
          const createRes = await apiFetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Geral' }),
          })
          const createData = await createRes.json()
          categoryId = createData.category?.id || ''
        }
      } catch (error) {
        console.error('Erro ao buscar/criar categoria:', error)
        // Se falhar, usar a categoria do produto existente ou deixar vazio
        categoryId = product?.categoryId || ''
      }

      // Preparar dados para envio
      const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        categoryId: categoryId,
        price: formData.price,
        cost: formData.cost,
        barcode: formData.barcode || null,
        sku: formData.sku || null,
        lowStockAlert: formData.lowStockAlert,
      }

      console.log('📤 Enviando dados:', { url, method, dataToSend })

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        let data: { error?: unknown; details?: string } = {}
        try {
          data = await response.json()
        } catch {
          data = {}
        }
        toast.error(getApiErrorMessage(data, `Erro ao salvar produto (${response.status})`))
        return
      }

      const data = await response.json()
      const savedProduct = data.product

      // Salvar variações
      // Atualizar ou criar variações
      console.log('📦 Salvando variações:', variations)
      for (const variation of variations) {
        if (variation.id) {
          // Atualizar variação existente
          console.log('🔄 Atualizando variação:', variation)
          const updateResponse = await apiFetch(`/api/products/${savedProduct.id}/variations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: variation.id,
              color: variation.color,
              size: variation.size,
              quantity: variation.quantity,
            }),
          })
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json().catch(() => ({}))
            console.error('❌ Erro ao atualizar variação:', errorData)
            throw new Error(getApiErrorMessage(errorData, 'Erro ao atualizar variação'))
          }
          
          const updateData = await updateResponse.json()
          console.log('✅ Variação atualizada:', updateData)
        } else {
          // Criar nova variação
          console.log('➕ Criando nova variação:', variation)
          const createResponse = await apiFetch(`/api/products/${savedProduct.id}/variations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              color: variation.color,
              size: variation.size,
              quantity: variation.quantity,
            }),
          })
          
          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}))
            console.error('❌ Erro ao criar variação:', errorData)
            throw new Error(getApiErrorMessage(errorData, 'Erro ao criar variação'))
          }
          
          const createData = await createResponse.json()
          console.log('✅ Variação criada:', createData)
        }
      }

      console.log('✅ Todas as variações foram salvas com sucesso!')
      toast.success('Produto e variações salvos com sucesso!')
      onSave()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      const msg = error instanceof Error ? error.message : 'Erro ao salvar produto'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const addVariation = () => {
    setVariations([...variations, { color: '', size: '', quantity: 0 }])
  }

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {product ? 'Editar Produto' : 'Novo Produto'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Preço de Venda *"
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                required
              />
              <Input
                label="Custo *"
                type="number"
                step="0.01"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código de Barras"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <Input
            label="Alerta de Estoque Baixo"
            type="number"
            value={formData.lowStockAlert || ''}
            onChange={(e) => setFormData({ ...formData, lowStockAlert: parseInt(e.target.value) || 5 })}
            placeholder="5"
          />

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Variações (Cor + Tamanho)</h3>
              <Button type="button" variant="secondary" onClick={addVariation}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {variations.map((variation, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <Input
                    label="Cor"
                    value={variation.color}
                    onChange={(e) => {
                      const newVariations = [...variations]
                      newVariations[index].color = e.target.value
                      setVariations(newVariations)
                    }}
                    placeholder="Ex: Azul"
                  />
                  <Input
                    label="Tamanho"
                    value={variation.size}
                    onChange={(e) => {
                      const newVariations = [...variations]
                      newVariations[index].size = e.target.value
                      setVariations(newVariations)
                    }}
                    placeholder="Ex: P"
                  />
                  <Input
                    label="Quantidade"
                    type="number"
                    min="0"
                    value={variation.quantity || ''}
                    onChange={(e) => {
                      const newVariations = [...variations]
                      const newQuantity = parseInt(e.target.value) || 0
                      newVariations[index].quantity = newQuantity
                      console.log('Atualizando quantidade:', { index, variationId: variation.id, newQuantity, variations: newVariations })
                      setVariations(newVariations)
                    }}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariation(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Package className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
