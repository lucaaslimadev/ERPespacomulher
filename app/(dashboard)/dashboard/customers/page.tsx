'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Search, User, Phone, Mail, ShoppingBag, Plus, Trash2, Edit } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      
      const response = await apiFetch(`/api/customers?${params}`)
      const data = response.ok ? await response.json() : { customers: [] }
      setCustomers((data as { customers?: unknown[] }).customers || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        loadCustomers()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const viewCustomer = async (customerId: string) => {
    try {
      const response = await apiFetch(`/api/customers/${customerId}`)
      if (!response.ok) return
      const data = await response.json()
      setSelectedCustomer(data)
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
    }
  }

  const handleCreateCustomer = async () => {
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
      const data = await response.json() as { customer?: unknown; error?: string }
      if (response.ok && data.customer) {
        setNewCustomer({ name: '', phone: '', email: '' })
        setShowCreateModal(false)
        loadCustomers()
        toast.success('Cliente cadastrado com sucesso!')
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

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (response.ok) {
        setCustomerToDelete(null)
        loadCustomers()
        toast.success('Cliente excluído.')
      } else {
        toast.error(data.error || 'Erro ao excluir cliente')
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de clientes e histórico de compras</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar clientes por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button onClick={loadCustomers}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-center py-8 text-gray-500">Carregando...</p>
      ) : customers.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-gray-500">Nenhum cliente encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-primary-100 rounded-full">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{customer.name}</h3>
                  {customer.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </p>
                  )}
                  {customer.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {customer._count?.sales || 0} compras
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      viewCustomer(customer.id)
                    }}
                    className="p-2 text-gray-600 hover:text-primary-600"
                    title="Ver histórico"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCustomerToDelete({ id: customer.id, name: customer.name })
                    }}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Cadastrar Novo Cliente</h2>
            <div className="space-y-4">
              <Input
                label="Nome *"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                required
                autoFocus
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
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateCustomer}
                  loading={loading}
                  disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()}
                  className="flex-1"
                >
                  Cadastrar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewCustomer({ name: '', phone: '', email: '' })
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
        open={customerToDelete !== null}
        onClose={() => setCustomerToDelete(null)}
        title="Excluir cliente"
        message={customerToDelete ? `Tem certeza que deseja excluir o cliente "${customerToDelete.name}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteCustomer}
      />
    </div>
  )
}

function CustomerDetailModal({ customer, onClose }: any) {
  const customerData = customer.customer || customer
  const stats = customer.stats || {}
  const sales = customerData?.sales || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{customerData?.name || 'Cliente'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <p className="text-sm text-gray-600">Total de Compras</p>
            <p className="text-2xl font-bold">{stats.totalSales || sales.length || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Valor Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalValue || sales.reduce((sum: number, sale: any) => 
                sum + parseFloat(sale.total.toString()), 0) || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Ticket Médio</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.averageTicket || (sales.length > 0 ? 
                sales.reduce((sum: number, sale: any) => sum + parseFloat(sale.total.toString()), 0) / sales.length : 0))}
            </p>
          </Card>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4">Histórico de Compras</h3>
          {sales.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma compra registrada</p>
          ) : (
            <div className="space-y-3">
              {sales.map((sale: any) => (
                <Card key={sale.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">Venda #{sale.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{formatDate(sale.createdAt)}</p>
                      {sale.paymentMethod && (
                        <p className="text-xs text-gray-500 mt-1">
                          {sale.paymentMethod === 'CREDITO_PARCELADO' && sale.installments && sale.installments.length > 0
                            ? `Crédito Parcelado (${sale.installments.length}x)`
                            : sale.paymentMethod}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(parseFloat(sale.total.toString()))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {sale.items && sale.items.map((item: any) => (
                      <div key={item.id} className="text-sm text-gray-600">
                        {item.quantity}x {item.product?.name || 'Produto'} - {item.variation?.color || ''} {item.variation?.size || ''}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onClose} className="mt-6 w-full">
          Fechar
        </Button>
      </div>
    </div>
  )
}
