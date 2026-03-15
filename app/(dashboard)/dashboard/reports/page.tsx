'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import {
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  Calendar,
  RefreshCw,
  Award,
} from 'lucide-react'

export default function ReportsPage() {
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) loadReports()
  }, [startDate, endDate])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const res = await apiFetch(`/api/reports/dashboard?${params}`)
      if (!res.ok) {
        setTopProducts([])
        setTopCustomers([])
        setLowStock([])
        setPaymentMethods([])
        return
      }
      const data = await res.json()
      setTopProducts(data.topProducts || [])
      setTopCustomers(data.topCustomers || [])
      setLowStock(data.lowStock || [])
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
      setTopProducts([])
      setTopCustomers([])
      setLowStock([])
      setPaymentMethods([])
    } finally {
      setLoading(false)
    }
  }

  const maxPaymentCount = Math.max(...paymentMethods.map((p) => p.count), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-1">Dashboard de análises e insights do negócio</p>
      </div>

      {/* Filtro de período */}
      <Card className="mb-8 p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium">Período</span>
          </div>
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="max-w-[180px]"
          />
          <Button onClick={loadReports} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grid principal: 2 colunas em lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos mais vendidos */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-5 border-b bg-gradient-to-r from-emerald-500 to-teal-600">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-white/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Produtos mais vendidos</h2>
                    <p className="text-emerald-100 text-sm">Por quantidade no período</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {topProducts.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma venda no período</p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                              index === 0
                                ? 'bg-amber-500'
                                : index === 1
                                  ? 'bg-gray-400'
                                  : index === 2
                                    ? 'bg-amber-700'
                                    : 'bg-emerald-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.quantity} un. vendidas
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-emerald-700">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Cliente que mais comprou */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-5 border-b bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Clientes que mais compraram</h2>
                    <p className="text-violet-100 text-sm">Por valor total no período</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {topCustomers.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma venda com cliente no período</p>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((customer, index) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">
                              {customer.purchaseCount} compra{customer.purchaseCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-violet-700">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estoque baixo */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-5 border-b bg-gradient-to-r from-rose-500 to-red-600">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-white/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Mercadorias com estoque baixo</h2>
                    <p className="text-rose-100 text-sm">Abaixo do ponto de alerta</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {lowStock.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Nenhum produto com estoque baixo
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lowStock.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-4 rounded-xl bg-rose-50 border border-rose-100"
                      >
                        <p className="font-semibold text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-500 mb-2">{item.product.category}</p>
                        <div className="space-y-1">
                          {item.variations.map((v: any) => (
                            <div
                              key={v.id}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600">
                                {v.color} / {v.size}
                              </span>
                              <span className="font-bold text-rose-600">
                                {v.quantity} un. (alerta: {item.product.lowStockAlert})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Forma de pagamento mais realizada */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-white/20">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Formas de pagamento</h2>
                    <p className="text-blue-100 text-sm">Mais utilizadas no período</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {paymentMethods.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma venda no período</p>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.map((pm) => (
                      <div key={pm.method} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{pm.label}</span>
                          <span className="text-gray-500">
                            {pm.count} venda{pm.count !== 1 ? 's' : ''} ·{' '}
                            {formatCurrency(pm.total)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                            style={{
                              width: `${Math.round((pm.count / maxPaymentCount) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
