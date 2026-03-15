'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, TrendingUp, TrendingDown, DollarSign, RefreshCw, BarChart3, Users, Package } from 'lucide-react'

export default function FinancialPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState<any>({
    topProducts: [],
    topCustomers: [],
    topProductsByQuantity: [],
  })

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadTransactions()
    }
  }, [startDate, endDate])

  // Atualizar automaticamente a cada 30 segundos
  useEffect(() => {
    if (startDate && endDate) {
      const interval = setInterval(() => {
        loadTransactions()
      }, 30000) // 30 segundos
      return () => clearInterval(interval)
    }
  }, [startDate, endDate])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const transactionsRes = await apiFetch(`/api/financial?${params}`)
      if (!transactionsRes.ok) {
        const err = await transactionsRes.json().catch(() => ({})) as { error?: string }
        toast.error(err?.error || 'Erro ao carregar transações')
        return
      }
      const transactionsData = await transactionsRes.json()
      setTransactions(transactionsData.transactions || [])
      setSummary(transactionsData.summary || {})

      const statsRes = await apiFetch(`/api/financial/stats?${params}`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600 mt-1">Controle financeiro e movimentações</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end gap-2">
            <Button onClick={loadTransactions} className="flex-1">
              Filtrar
            </Button>
            <Button onClick={loadTransactions} variant="secondary" title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Entradas</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalEntradas || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Saídas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalSaidas || 0)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resultado</p>
              <p className={`text-2xl font-bold ${
                (summary.resultado || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.resultado || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary-600" />
          </div>
        </Card>
      </div>

      {/* Gráficos e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Itens Mais Vendidos */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold">Itens Mais Vendidos</h3>
          </div>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-2">
              {stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                  </div>
                  <p className="text-sm font-bold text-primary-600">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>
          )}
        </Card>

        {/* Clientes com Mais Compras */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold">Clientes com Mais Compras</h3>
          </div>
          {stats.topCustomers && stats.topCustomers.length > 0 ? (
            <div className="space-y-2">
              {stats.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.purchaseCount} compras</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>
          )}
        </Card>

        {/* Produtos com Maior Saída */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold">Produtos com Maior Saída</h3>
          </div>
          {stats.topProductsByQuantity && stats.topProductsByQuantity.length > 0 ? (
            <div className="space-y-2">
              {stats.topProductsByQuantity.slice(0, 5).map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades vendidas</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>
          )}
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Movimentações</h2>
        {loading ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhuma transação encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Data</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Categoria</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Descrição</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{formatDate(transaction.date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'ENTRADA'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{transaction.category}</td>
                    <td className="p-3 text-sm">{transaction.description}</td>
                    <td className={`p-3 text-sm text-right font-medium ${
                      transaction.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'ENTRADA' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount.toString()))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={loadTransactions}
        />
      )}
    </div>
  )
}

function TransactionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    type: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category.trim()) {
      toast.error('Categoria é obrigatória')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    const amount = Number(formData.amount)
    if (!(amount > 0)) {
      toast.error('Informe um valor maior que zero')
      return
    }

    setLoading(true)
    try {
      const payload = {
        type: formData.type,
        category: formData.category.trim(),
        description: formData.description.trim(),
        amount,
        date: formData.date || undefined,
      }
      const response = await apiFetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        toast.error(data.error || 'Erro ao criar transação')
        return
      }

      toast.success('Transação registrada.')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      toast.error('Erro ao criar transação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Nova Transação</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ENTRADA' | 'SAIDA' })}
              className="input"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </select>
          </div>

          <Input
            label="Categoria *"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="Ex: Aluguel, Fornecedor, etc."
          />

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
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
