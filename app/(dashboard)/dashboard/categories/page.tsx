'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { apiFetch } from '@/lib/api'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [categoryName, setCategoryName] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      toast.error('Digite o nome da categoria')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao criar categoria')
        return
      }

      setCategoryName('')
      setShowModal(false)
      loadCategories()
      toast.success('Categoria criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      toast.error('Erro ao criar categoria')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir categoria')
        return
      }

      setDeleteTargetId(null)
      loadCategories()
      toast.success('Categoria excluída.')
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600 mt-1">Gerenciar categorias de produtos</p>
        </div>
        <Button onClick={() => {
          setSelectedCategory(null)
          setCategoryName('')
          setShowModal(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {loading && categories.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma categoria cadastrada</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Package className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.active ? 'Ativa' : 'Inativa'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedCategory(category)
                      setCategoryName(category.name)
                      setShowModal(true)
                    }}
                    className="p-2 text-gray-600 hover:text-primary-600"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(category.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Excluir"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>

            <div className="space-y-4">
              <Input
                label="Nome da Categoria *"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex: Blusas, Calças, etc."
                required
                autoFocus
              />

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreate}
                  loading={loading}
                  disabled={!categoryName.trim()}
                  className="flex-1"
                >
                  {selectedCategory ? 'Atualizar' : 'Criar'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedCategory(null)
                    setCategoryName('')
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir categoria"
        message="Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => { if (deleteTargetId) handleDelete(deleteTargetId) }}
      />
    </div>
  )
}
