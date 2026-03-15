'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  CreditCard,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dueAlerts, setDueAlerts] = useState<any>(null)
  const [accountsPayable, setAccountsPayable] = useState<any[]>([])
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  useEffect(() => {
    loadStats()
    loadDueAlerts()
    loadNotifications()
    const interval = setInterval(() => {
      loadStats()
      loadDueAlerts()
      loadNotifications()
    }, 60000) // Atualizar a cada minuto
    return () => clearInterval(interval)
  }, [])

  const loadDueAlerts = async () => {
    try {
      const response = await apiFetch('/api/notifications/check')
      if (response.ok) {
        const data = await response.json()
        // Buscar notificações não lidas
        const notificationsRes = await apiFetch('/api/notifications?read=false')
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json()
          setDueAlerts(notificationsData.notifications || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error)
    }
  }

  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const in7Days = new Date(today)
      in7Days.setDate(in7Days.getDate() + 7)

      // Contas a Pagar
      const payableResponse = await apiFetch('/api/accounts-payable')
      const payableData = payableResponse.ok ? await payableResponse.json() : { accounts: [] }
      const payable = (payableData.accounts || []).filter((acc: any) => 
        !acc.paid && new Date(acc.dueDate) <= in7Days
      ).sort((a: any, b: any) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      setAccountsPayable(payable.slice(0, 5))

      // Contas a Receber
      const receivableResponse = await (await import('@/lib/api')).apiFetch('/api/accounts-receivable')
      const receivableData = receivableResponse.ok ? await receivableResponse.json() : { accounts: [] }
      const receivable = (receivableData.accounts || []).filter((acc: any) => 
        !acc.received && new Date(acc.dueDate) <= in7Days
      ).sort((a: any, b: any) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      setAccountsReceivable(receivable.slice(0, 5))

      // Despesas Fixas
      const expensesResponse = await apiFetch('/api/fixed-expenses')
      const expensesData = expensesResponse.ok ? await expensesResponse.json() : { expenses: [] }
      const todayDay = today.getDate()
      const expenses = (expensesData.expenses || []).filter((exp: any) => 
        exp.active && (exp.dayOfMonth >= todayDay && exp.dayOfMonth <= todayDay + 7)
      ).sort((a: any, b: any) => a.dayOfMonth - b.dayOfMonth)
      setFixedExpenses(expenses.slice(0, 5))
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const loadStats = async () => {
    try {
      // Adicionar timeout de 30 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await apiFetch('/api/dashboard/stats', {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Erro na API:', response.status, errorData)
        throw new Error(errorData.error || `Erro ${response.status}: Erro ao carregar estatísticas`)
      }
      
      const data = await response.json()
      console.log('Estatísticas carregadas:', data)
      // Garantir que charts não existe (removido)
      if (data.charts) {
        delete data.charts
      }
      setStats(data)
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error)
      
      // Se for erro de timeout ou abort
      if (error.name === 'AbortError') {
        console.error('Timeout ao carregar estatísticas')
      }
      
      // Definir valores padrão para não quebrar a UI
      setStats({
        today: { total: 0, count: 0, ticket: 0, change: 0 },
        month: { total: 0, count: 0, change: 0 },
        topProductsToday: [],
        stock: { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 },
        paymentMethods: { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, MISTO: 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 w-full">
        <p className="text-center py-8 text-gray-500">Carregando...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6 w-full">
        <p className="text-center py-8 text-gray-500">Erro ao carregar estatísticas</p>
      </div>
    )
  }

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR')
  }

  const getDaysUntilDue = (dueDate: string | Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
    due.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="p-6 w-full" suppressHydrationWarning>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do negócio em tempo real</p>
      </div>

      {/* Alertas de Contas a Vencer */}
      {dueAlerts && dueAlerts.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-yellow-600" suppressHydrationWarning />
            <h2 className="text-lg font-bold text-yellow-900">Avisos de Contas a Vencer</h2>
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
              {dueAlerts.length}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {dueAlerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-2 bg-white rounded border border-yellow-200">
                <Calendar className="w-4 h-4 text-yellow-600 flex-shrink-0" suppressHydrationWarning />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                  <p className="text-xs text-gray-600 truncate">{alert.message}</p>
                </div>
                <Link 
                  href={
                    alert.type.includes('PAYABLE') ? '/dashboard/accounts-payable' :
                    alert.type.includes('RECEIVABLE') ? '/dashboard/accounts-receivable' :
                    '/dashboard/fixed-expenses'
                  }
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver
                </Link>
              </div>
            ))}
            {dueAlerts.length > 5 && (
              <p className="text-xs text-gray-600 text-center pt-2">
                +{dueAlerts.length - 5} avisos adicionais
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Vendas do Dia */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendas Hoje</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.today.total)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {stats.today.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" suppressHydrationWarning />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" suppressHydrationWarning />
                )}
                <span className={`text-sm font-medium ${
                  stats.today.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.today.change >= 0 ? '+' : ''}{stats.today.change.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs ontem</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" suppressHydrationWarning />
            </div>
          </div>
        </Card>

        {/* Quantidade de Vendas */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.today.count}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Ticket médio: {formatCurrency(stats.today.ticket)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" suppressHydrationWarning />
            </div>
          </div>
        </Card>

        {/* Vendas do Mês */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendas do Mês</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.month.total)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {stats.month.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" suppressHydrationWarning />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" suppressHydrationWarning />
                )}
                <span className={`text-sm font-medium ${
                  stats.month.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.month.change >= 0 ? '+' : ''}{stats.month.change.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs mês anterior</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" suppressHydrationWarning />
            </div>
          </div>
        </Card>

        {/* Estoque */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status do Estoque</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.stock.totalProducts}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {stats.stock.lowStockCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" suppressHydrationWarning />
                    <span className="text-xs text-yellow-600">{stats.stock.lowStockCount} baixo</span>
                  </div>
                )}
                {stats.stock.outOfStockCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" suppressHydrationWarning />
                    <span className="text-xs text-red-600">{stats.stock.outOfStockCount} zerado</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" suppressHydrationWarning />
            </div>
          </div>
        </Card>
      </div>

      {/* Painel de Notificações */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6 text-blue-600" suppressHydrationWarning />
          <h2 className="text-2xl font-bold text-blue-900">Painel de Notificações</h2>
        </div>
        <p className="text-sm text-blue-700 mb-2">
          Acompanhe contas a pagar, contas a receber e despesas fixas próximas do vencimento
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Notificações de Contas a Pagar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-red-600" suppressHydrationWarning />
              <h2 className="text-xl font-bold">Contas a Pagar</h2>
            </div>
            <Link 
              href="/dashboard/accounts-payable"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Ver todas
            </Link>
          </div>
          {loadingNotifications ? (
            <p className="text-center py-8 text-gray-500">Carregando...</p>
          ) : accountsPayable.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma conta a pagar nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accountsPayable.map((account: any) => {
                const daysUntil = getDaysUntilDue(account.dueDate)
                const isOverdue = daysUntil < 0
                const isToday = daysUntil === 0
                
                return (
                  <div 
                    key={account.id} 
                    className={`p-3 rounded-lg border ${
                      isOverdue ? 'bg-red-50 border-red-200' :
                      isToday ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{account.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-gray-500" suppressHydrationWarning />
                          <p className="text-xs text-gray-600">{formatDate(account.dueDate)}</p>
                          {account.supplier && (
                            <span className="text-xs text-gray-500">• {account.supplier.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-red-600">
                          {formatCurrency(parseFloat(account.amount.toString()))}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isOverdue ? 'text-red-600 font-bold' :
                          isToday ? 'text-yellow-600 font-medium' :
                          'text-gray-500'
                        }`}>
                          {isOverdue ? `Vencida há ${Math.abs(daysUntil)} dia(s)` :
                           isToday ? 'Vence hoje' :
                           `${daysUntil} dia(s)`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Notificações de Contas a Receber */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-green-600" suppressHydrationWarning />
              <h2 className="text-xl font-bold">Contas a Receber</h2>
            </div>
            <Link 
              href="/dashboard/accounts-receivable"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Ver todas
            </Link>
          </div>
          {loadingNotifications ? (
            <p className="text-center py-8 text-gray-500">Carregando...</p>
          ) : accountsReceivable.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma conta a receber nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accountsReceivable.map((account: any) => {
                const daysUntil = getDaysUntilDue(account.dueDate)
                const isOverdue = daysUntil < 0
                const isToday = daysUntil === 0
                
                return (
                  <div 
                    key={account.id} 
                    className={`p-3 rounded-lg border ${
                      isOverdue ? 'bg-red-50 border-red-200' :
                      isToday ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{account.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-gray-500" suppressHydrationWarning />
                          <p className="text-xs text-gray-600">{formatDate(account.dueDate)}</p>
                          {account.customer && (
                            <span className="text-xs text-gray-500">• {account.customer.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">
                          {formatCurrency(parseFloat(account.amount.toString()))}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isOverdue ? 'text-red-600 font-bold' :
                          isToday ? 'text-yellow-600 font-medium' :
                          'text-gray-500'
                        }`}>
                          {isOverdue ? `Vencida há ${Math.abs(daysUntil)} dia(s)` :
                           isToday ? 'Vence hoje' :
                           `${daysUntil} dia(s)`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Despesas Fixas */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" suppressHydrationWarning />
            <h2 className="text-xl font-bold">Despesas Fixas</h2>
          </div>
          <Link 
            href="/dashboard/fixed-expenses"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Ver todas
          </Link>
        </div>
        {loadingNotifications ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : fixedExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma despesa fixa nos próximos 7 dias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fixedExpenses.map((expense: any) => {
              const today = new Date()
              const todayDay = today.getDate()
              const daysUntil = expense.dayOfMonth - todayDay
              
              return (
                <div 
                  key={expense.id} 
                  className={`p-3 rounded-lg border ${
                    daysUntil === 0 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{expense.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-gray-500" suppressHydrationWarning />
                        <p className="text-xs text-gray-600">Dia {expense.dayOfMonth} de cada mês</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-blue-600">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </p>
                      <p className={`text-xs mt-1 ${
                        daysUntil === 0 ? 'text-yellow-600 font-medium' :
                        'text-gray-500'
                      }`}>
                        {daysUntil === 0 ? 'Vence hoje' :
                         daysUntil === 1 ? 'Vence amanhã' :
                         `${daysUntil} dias`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

        {/* Produtos Mais Vendidos Hoje */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Produtos Mais Vendidos Hoje</h2>
          {stats.topProductsToday.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Nenhuma venda hoje</p>
          ) : (
            <div className="space-y-3">
              {stats.topProductsToday.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.quantity} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary-600">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      {/* Formas de Pagamento */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Formas de Pagamento (Hoje)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(stats.paymentMethods).map(([method, value]: [string, any]) => (
            <div key={method} className="p-4 bg-gray-50 rounded-lg text-center">
              <CreditCard className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">{method}</p>
              <p className="text-lg font-bold text-primary-600 mt-1">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/pdv">
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-primary-600" suppressHydrationWarning />
              <div>
                <p className="font-medium">Abrir PDV</p>
                <p className="text-sm text-gray-600">Iniciar nova venda</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/sales">
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              <div>
                <p className="font-medium">Histórico de Vendas</p>
                <p className="text-sm text-gray-600">Ver todas as vendas</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/reports">
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              <div>
                <p className="font-medium">Relatórios</p>
                <p className="text-sm text-gray-600">Análises detalhadas</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
