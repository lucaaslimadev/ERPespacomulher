'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Check, Trash2, AlertCircle, Calendar } from 'lucide-react'

export default function AccountsPayablePage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterPaid, setFilterPaid] = useState<string>('all')
  const [markPaidTarget, setMarkPaidTarget] = useState<{ id: string; amount: string } | null>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setStartDate(today.toISOString().split('T')[0])
    setEndDate(nextMonth.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadAccounts()
    }
  }, [startDate, endDate, filterPaid])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (filterPaid !== 'all') params.append('paid', filterPaid)
      
      const response = await apiFetch(`/api/accounts-payable?${params}`)
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Erro ao carregar contas a pagar:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!markPaidTarget) return
    setMarkingPaid(true)
    try {
      const response = await apiFetch(`/api/accounts-payable/${markPaidTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: true, paidAmount: parseFloat(markPaidTarget.amount) }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao marcar como paga')
        return
      }

      setMarkPaidTarget(null)
      loadAccounts()
      toast.success('Conta marcada como paga.')
    } catch (error) {
      console.error('Erro ao marcar como paga:', error)
      toast.error('Erro ao marcar como paga')
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/accounts-payable/${deleteTargetId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir conta a pagar')
        return
      }
      setDeleteTargetId(null)
      loadAccounts()
      toast.success('Conta a pagar excluída.')
    } catch (error) {
      console.error('Erro ao excluir conta a pagar:', error)
      toast.error('Erro ao excluir conta a pagar')
    } finally {
      setDeleting(false)
    }
  }

  const totalAmount = accounts.reduce((sum, acc) => sum + parseFloat(acc.amount.toString()), 0)
  const paidAmount = accounts.filter(a => a.paid).reduce((sum, acc) => sum + parseFloat(acc.paidAmount.toString()), 0)
  const pendingAmount = totalAmount - paidAmount
  const overdueCount = accounts.filter(a => !a.paid && new Date(a.dueDate) < new Date()).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de contas a pagar</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Data Inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data Final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value)}
              className="input"
            >
              <option value="all">Todas</option>
              <option value="false">Pendentes</option>
              <option value="true">Pagas</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={loadAccounts} className="w-full">
              Filtrar
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Pago</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(paidAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Pendente</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {formatCurrency(pendingAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Vencidas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {overdueCount}
          </p>
        </Card>
      </div>

      {/* Lista de Contas */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Contas a Pagar</h2>
        {loading ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : accounts.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhuma conta encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Descrição</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Fornecedor</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Categoria</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Vencimento</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isOverdue = !account.paid && new Date(account.dueDate) < new Date()
                  const isDueSoon = !account.paid && new Date(account.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                  
                  return (
                    <tr key={account.id} className={`border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}`}>
                      <td className="p-3 text-sm font-medium">{account.description}</td>
                      <td className="p-3 text-sm">{account.supplier?.name || '-'}</td>
                      <td className="p-3 text-sm">{account.category}</td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(account.dueDate)}
                          {isOverdue && (
                            <span title="Vencida"><AlertCircle className="w-4 h-4 text-red-600" aria-hidden /></span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(parseFloat(account.amount.toString()))}
                      </td>
                      <td className="p-3">
                        {account.paid ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Paga
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!account.paid && (
                            <button
                              onClick={() => setMarkPaidTarget({ id: account.id, amount: account.amount.toString() })}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Marcar como paga"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTargetId(account.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <AccountPayableModal
          onClose={() => setShowModal(false)}
          onSuccess={loadAccounts}
        />
      )}

      <ConfirmModal
        open={markPaidTarget !== null}
        onClose={() => setMarkPaidTarget(null)}
        title="Marcar como paga"
        message="Marcar esta conta como paga?"
        confirmLabel="Sim, marcar"
        cancelLabel="Cancelar"
        variant="primary"
        loading={markingPaid}
        onConfirm={handleMarkAsPaid}
      />

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir conta a pagar"
        message="Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function AccountPayableModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    description: '',
    supplierId: '',
    supplier: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    observations: '',
  })
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  useEffect(() => {
    const loadSuppliers = async () => {
      setLoadingSuppliers(true)
      try {
        const response = await apiFetch('/api/suppliers')
        if (response.ok) {
          const data = await response.json()
          setSuppliers(data.suppliers || [])
        } else {
          setSuppliers([])
        }
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error)
        setSuppliers([])
      } finally {
        setLoadingSuppliers(false)
      }
    }
    loadSuppliers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (!formData.category.trim()) {
      toast.error('Categoria é obrigatória')
      return
    }
    const amount = Number(formData.amount)
    if (!(amount > 0)) {
      toast.error('Informe um valor maior que zero')
      return
    }
    if (!formData.dueDate) {
      toast.error('Data de vencimento é obrigatória')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/accounts-payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description.trim(),
          supplierId: formData.supplierId?.trim() || null,
          amount,
          dueDate: formData.dueDate,
          category: formData.category.trim(),
          observations: formData.observations?.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        toast.error(data.error || 'Erro ao criar conta a pagar')
        return
      }

      toast.success('Conta a pagar criada.')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error)
      toast.error('Erro ao criar conta a pagar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Nova Conta a Pagar</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Descrição *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fornecedor
            </label>
            <select
              value={formData.supplierId || ''}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, supplier: e.target.value ? '' : formData.supplier })}
              className="input mb-2"
            >
              <option value="">Selecione um fornecedor cadastrado</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {!formData.supplierId && (
              <Input
                label="Ou digite o nome do fornecedor"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor *"
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              required
            />
            <Input
              label="Data de Vencimento *"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Categoria *"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="Ex: Aluguel, Fornecedor, etc."
          />

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
