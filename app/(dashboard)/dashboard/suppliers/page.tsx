'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { getApiErrorMessage } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Edit, Trash2, Building2, Phone, Mail, FileText } from 'lucide-react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers()
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const response = await apiFetch(`/api/suppliers?${params}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(getApiErrorMessage(data, 'Erro ao carregar fornecedores'))
        setSuppliers([])
        return
      }
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
      toast.error('Falha ao conectar. Verifique se o servidor está rodando.')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(getApiErrorMessage(data, 'Erro ao excluir fornecedor'))
        return
      }

      setDeleteTargetId(null)
      loadSuppliers()
      toast.success('Fornecedor excluído.')
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      toast.error('Erro ao excluir fornecedor')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de fornecedores</p>
        </div>
        <Button onClick={() => {
          setSelectedSupplier(null)
          setShowModal(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Buscar fornecedores por nome, telefone, email ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {loading && suppliers.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        </Card>
      ) : suppliers.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum fornecedor cadastrado</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Fornecedor
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                    {supplier.cnpj && (
                      <p className="text-xs text-gray-500">CNPJ: {supplier.cnpj}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier)
                      setShowModal(true)
                    }}
                    className="p-2 text-gray-600 hover:text-primary-600"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(supplier.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 mt-0.5" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
                {supplier._count && supplier._count.accountsPayable > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      {supplier._count.accountsPayable} conta(s) a pagar vinculada(s)
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowModal(false)
            setSelectedSupplier(null)
          }}
          onSuccess={loadSuppliers}
        />
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir fornecedor"
        message="Tem certeza que deseja excluir este fornecedor?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => { if (deleteTargetId) handleDelete(deleteTargetId) }}
      />
    </div>
  )
}

function SupplierModal({ supplier, onClose, onSuccess }: { supplier?: any; onClose: () => void; onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    cnpj: supplier?.cnpj || '',
    address: supplier?.address || '',
    observations: supplier?.observations || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)
    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          cnpj: formData.cnpj?.trim() || null,
          address: formData.address?.trim() || null,
          observations: formData.observations?.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(getApiErrorMessage(data, 'Erro ao salvar fornecedor'))
        return
      }

      toast.success(supplier ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      toast.error('Erro ao salvar fornecedor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="CNPJ"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="fornecedor@exemplo.com"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              rows={2}
              placeholder="Rua, número, bairro, cidade..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" loading={loading} className="flex-1">
              {supplier ? 'Atualizar' : 'Cadastrar'}
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
