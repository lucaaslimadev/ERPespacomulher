'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'

export default function FixedExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/fixed-expenses')
      const data = await response.json()
      setExpenses(data.expenses || [])
    } catch (error) {
      console.error('Erro ao carregar despesas fixas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/fixed-expenses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir despesa')
        return
      }

      setDeleteTargetId(null)
      loadExpenses()
      toast.success('Despesa excluída.')
    } catch (error) {
      console.error('Erro ao excluir despesa:', error)
      toast.error('Erro ao excluir despesa')
    } finally {
      setDeleting(false)
    }
  }

  const today = new Date()
  const todayDay = today.getDate()
  const totalAmount = expenses.filter(e => e.active).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  const dueToday = expenses.filter(e => e.active && e.dayOfMonth === todayDay)
  const dueSoon = expenses.filter(e => e.active && e.dayOfMonth > todayDay && e.dayOfMonth <= todayDay + 3)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Despesas Fixas</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de despesas recorrentes</p>
        </div>
        <Button onClick={() => {
          setSelectedExpense(null)
          setShowModal(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa Fixa
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <p className="text-sm text-gray-600">Total Mensal</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Vencendo Hoje</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {dueToday.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Vencendo em 3 dias</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {dueSoon.length}
          </p>
        </Card>
      </div>

      {/* Lista de Despesas */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Despesas Fixas</h2>
        {loading ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : expenses.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhuma despesa fixa cadastrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Descrição</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Categoria</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Dia do Mês</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const isDueToday = expense.active && expense.dayOfMonth === todayDay
                  const isDueSoon = expense.active && expense.dayOfMonth > todayDay && expense.dayOfMonth <= todayDay + 3
                  
                  return (
                    <tr key={expense.id} className={`border-b hover:bg-gray-50 ${isDueToday ? 'bg-orange-50' : isDueSoon ? 'bg-yellow-50' : ''}`}>
                      <td className="p-3 text-sm font-medium">{expense.description}</td>
                      <td className="p-3 text-sm">{expense.category}</td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          Dia {expense.dayOfMonth}
                          {isDueToday && (
                            <span title="Vence hoje"><AlertCircle className="w-4 h-4 text-orange-600" aria-hidden /></span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </td>
                      <td className="p-3">
                        {expense.active ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedExpense(expense)
                              setShowModal(true)
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(expense.id)}
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
        <FixedExpenseModal
          expense={selectedExpense}
          onClose={() => {
            setShowModal(false)
            setSelectedExpense(null)
            loadExpenses()
          }}
        />
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir despesa fixa"
        message="Tem certeza que deseja excluir esta despesa fixa?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => { if (deleteTargetId) handleDelete(deleteTargetId) }}
      />
    </div>
  )
}

function FixedExpenseModal({ expense, onClose }: { expense?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    amount: expense ? parseFloat(expense.amount.toString()) : 0,
    category: expense?.category || '',
    dayOfMonth: expense?.dayOfMonth || 1,
    observations: expense?.observations || '',
    active: expense?.active ?? true,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = expense ? `/api/fixed-expenses/${expense.id}` : '/api/fixed-expenses'
      const method = expense ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao salvar despesa fixa')
        return
      }

      toast.success(expense ? 'Despesa atualizada.' : 'Despesa cadastrada.')
      onClose()
    } catch (error) {
      console.error('Erro ao salvar despesa fixa:', error)
      toast.error('Erro ao salvar despesa fixa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">
          {expense ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Descrição *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia do Mês * (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dayOfMonth || ''}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                className="input"
                placeholder="1"
                required
              />
            </div>
          </div>

          <Input
            label="Categoria *"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="Ex: Aluguel, Salários, etc."
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

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Ativa</span>
            </label>
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
