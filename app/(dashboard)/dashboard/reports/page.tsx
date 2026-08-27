'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Wallet,
  Landmark,
  BarChart3,
  ShieldAlert,
  PieChart,
} from 'lucide-react'

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = await res.json()
    if (j?.error && typeof j.error === 'string') return j.error
  } catch {
    /* ignore */
  }
  return `Falha ao carregar (${res.status})`
}

export default function ReportsPage() {
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dreRegime, setDreRegime] = useState<'caixa' | 'competencia'>('competencia')
  const [dre, setDre] = useState<any>(null)
  const [cashflow30, setCashflow30] = useState<any>(null)
  const [aging, setAging] = useState<any>(null)
  const [lossAudit, setLossAudit] = useState<any>(null)
  const [marginReport, setMarginReport] = useState<any>(null)

  const [errDashboard, setErrDashboard] = useState<string | null>(null)
  const [errDre, setErrDre] = useState<string | null>(null)
  const [errCashflow, setErrCashflow] = useState<string | null>(null)
  const [errAging, setErrAging] = useState<string | null>(null)
  const [errLoss, setErrLoss] = useState<string | null>(null)
  const [errMargin, setErrMargin] = useState<string | null>(null)
  const [errNetwork, setErrNetwork] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [])

  const loadReports = useCallback(async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    setErrNetwork(null)
    setErrDashboard(null)
    setErrDre(null)
    setErrCashflow(null)
    setErrAging(null)
    setErrLoss(null)
    setErrMargin(null)

    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    params.append('regime', dreRegime)

    try {
      const [dashboardRes, dreRes, cashflowRes, agingRes, lossRes, marginRes] = await Promise.all([
        apiFetch(`/api/reports/dashboard?${params}`),
        apiFetch(`/api/reports/dre?${params}`),
        apiFetch('/api/reports/cashflow-projection?horizon=30'),
        apiFetch('/api/reports/receivables-aging'),
        apiFetch(`/api/reports/loss-audit?${params}`),
        apiFetch(`/api/reports/margin?${params}`),
      ])

      if (dashboardRes.ok) {
        const data = await dashboardRes.json()
        setTopProducts(data.topProducts || [])
        setTopCustomers(data.topCustomers || [])
        setLowStock(data.lowStock || [])
        setPaymentMethods(data.paymentMethods || [])
        setErrDashboard(null)
      } else {
        setTopProducts([])
        setTopCustomers([])
        setLowStock([])
        setPaymentMethods([])
        setErrDashboard(await readErrorMessage(dashboardRes))
      }

      if (dreRes.ok) {
        setDre(await dreRes.json())
        setErrDre(null)
      } else {
        setDre(null)
        setErrDre(await readErrorMessage(dreRes))
      }

      if (cashflowRes.ok) {
        setCashflow30(await cashflowRes.json())
        setErrCashflow(null)
      } else {
        setCashflow30(null)
        setErrCashflow(await readErrorMessage(cashflowRes))
      }

      if (agingRes.ok) {
        setAging(await agingRes.json())
        setErrAging(null)
      } else {
        setAging(null)
        setErrAging(await readErrorMessage(agingRes))
      }

      if (lossRes.ok) {
        setLossAudit(await lossRes.json())
        setErrLoss(null)
      } else {
        setLossAudit(null)
        setErrLoss(await readErrorMessage(lossRes))
      }

      if (marginRes.ok) {
        setMarginReport(await marginRes.json())
        setErrMargin(null)
      } else {
        setMarginReport(null)
        setErrMargin(await readErrorMessage(marginRes))
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
      setErrNetwork('Não foi possível conectar ao servidor. Verifique a rede e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, dreRegime])

  useEffect(() => {
    if (startDate && endDate) loadReports()
  }, [startDate, endDate, loadReports])

  const maxPaymentCount = Math.max(...paymentMethods.map((p) => p.count), 1)

  const grossMarginPct =
    marginReport?.summary?.revenue > 0
      ? (marginReport.summary.grossMargin / marginReport.summary.revenue) * 100
      : null

  const bucketLabels: Record<string, string> = {
    current: 'A vencer',
    '0-30': '1–30 dias',
    '31-60': '31–60 dias',
    '61-90': '61–90 dias',
    '90+': '90+ dias',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-1">
          Visão gerencial (DRE, margem, fluxo, aging, perdas) e indicadores operacionais do período.
        </p>
      </div>

      {errNetwork && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errNetwork}
        </div>
      )}

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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Regime DRE</label>
            <select
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              value={dreRegime}
              onChange={(e) => setDreRegime(e.target.value as 'caixa' | 'competencia')}
            >
              <option value="competencia">Competência</option>
              <option value="caixa">Caixa</option>
            </select>
          </div>
          <Button onClick={loadReports} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </Card>

      <div className="space-y-10">
        <section id="relatorios-gerenciais" className="scroll-mt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-600" />
            Relatórios gerenciais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Card className={`p-4 border-0 shadow-lg ${loading ? 'animate-pulse' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">DRE — Resultado operacional</p>
                  {errDre ? (
                    <p className="text-sm text-red-600 mt-2">{errDre}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-900 truncate">
                        {formatCurrency(dre?.summary?.operationalResult ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Regime: {dreRegime}</p>
                    </>
                  )}
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600 shrink-0" />
              </div>
            </Card>
            <Card className={`p-4 border-0 shadow-lg ${loading ? 'animate-pulse' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">Margem bruta sobre vendas</p>
                  {errMargin ? (
                    <p className="text-sm text-red-600 mt-2">{errMargin}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {(grossMarginPct != null ? grossMarginPct : Number(dre?.summary?.netMargin ?? 0)).toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        CMV: {formatCurrency(marginReport?.summary?.cost ?? dre?.summary?.cmv ?? 0)}
                      </p>
                    </>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-600 shrink-0" />
              </div>
            </Card>
            <Card className={`p-4 border-0 shadow-lg ${loading ? 'animate-pulse' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">Fluxo projetado (30 dias)</p>
                  {errCashflow ? (
                    <p className="text-sm text-red-600 mt-2">{errCashflow}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-900 truncate">
                        {formatCurrency(cashflow30?.summary?.projectedNet ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Recebíveis no horizonte:{' '}
                        {formatCurrency(cashflow30?.summary?.projectedReceiptsKnown ?? 0)}
                      </p>
                    </>
                  )}
                </div>
                <Wallet className="w-8 h-8 text-blue-600 shrink-0" />
              </div>
            </Card>
            <Card className={`p-4 border-0 shadow-lg ${loading ? 'animate-pulse' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">Inadimplência (aging)</p>
                  {errAging ? (
                    <p className="text-sm text-red-600 mt-2">{errAging}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {Number(aging?.summary?.overdueRate ?? 0).toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Em atraso: {formatCurrency(aging?.summary?.overdueOpen ?? 0)}
                      </p>
                    </>
                  )}
                </div>
                <Landmark className="w-8 h-8 text-amber-600 shrink-0" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">DRE — detalhamento</h3>
              {errDre ? (
                <p className="text-sm text-red-600">{errDre}</p>
              ) : !dre ? (
                <p className="text-sm text-gray-500">Sem dados para o período.</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">Receita bruta</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.revenueGross)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">Descontos</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.discounts)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">Receita líquida</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.revenueNet)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">CMV</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.cmv)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">Despesas fixas (estim.)</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.fixedExpenses)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-600">Despesas variáveis (estim.)</dt>
                    <dd className="font-medium">{formatCurrency(dre.summary.variableExpenses)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-2">
                    <dt className="text-gray-900 font-semibold">Resultado operacional</dt>
                    <dd className="font-bold text-indigo-700">
                      {formatCurrency(dre.summary.operationalResult)}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-600">Margem líquida % (DRE)</dt>
                    <dd className="font-medium">{Number(dre.summary.netMargin).toFixed(2)}%</dd>
                  </div>
                  {dreRegime === 'caixa' && dre.cash && (
                    <>
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <dt className="text-gray-600">Entradas (caixa)</dt>
                        <dd className="font-medium">{formatCurrency(dre.cash.entries)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Saídas (caixa)</dt>
                        <dd className="font-medium">{formatCurrency(dre.cash.outputs)}</dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
            </Card>

            <Card className="p-5 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Margem por produto (top 10)</h3>
              {errMargin ? (
                <p className="text-sm text-red-600">{errMargin}</p>
              ) : !marginReport?.products?.length ? (
                <p className="text-sm text-gray-500">Nenhuma venda no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 pr-2">Produto</th>
                        <th className="pb-2 pr-2">Categoria</th>
                        <th className="pb-2 text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marginReport.products.slice(0, 10).map((p: any) => (
                        <tr key={p.productId} className="border-b border-gray-50">
                          <td className="py-2 pr-2 font-medium text-gray-900">{p.productName}</td>
                          <td className="py-2 pr-2 text-gray-600">{p.category}</td>
                          <td className="py-2 text-right text-emerald-700">
                            {formatCurrency(p.grossMargin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5 border border-gray-200 shadow-sm lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-3">Fluxo de caixa projetado</h3>
              {errCashflow ? (
                <p className="text-sm text-red-600">{errCashflow}</p>
              ) : !cashflow30 ? (
                <p className="text-sm text-gray-500">Sem dados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Horizonte</dt>
                      <dd>{cashflow30.horizonDays} dias</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Recebíveis conhecidos</dt>
                      <dd>{formatCurrency(cashflow30.summary.projectedReceiptsKnown)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Previsão de vendas (média 30d)</dt>
                      <dd>{formatCurrency(cashflow30.summary.projectedSalesForecast)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Pagamentos a vencer</dt>
                      <dd>{formatCurrency(cashflow30.summary.projectedPayments)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Despesas fixas no período</dt>
                      <dd>{formatCurrency(cashflow30.summary.projectedFixedExpenses)}</dd>
                    </div>
                    <div className="flex justify-between font-semibold text-blue-800 pt-2 border-t">
                      <dt>Saldo projetado</dt>
                      <dd>{formatCurrency(cashflow30.summary.projectedNet)}</dd>
                    </div>
                  </dl>
                  <div className="rounded-lg bg-slate-50 p-3 text-gray-600">
                    <p className="text-xs">
                      Títulos: {cashflow30.details?.payablesCount ?? 0} a pagar,{' '}
                      {cashflow30.details?.receivablesCount ?? 0} a receber no período.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5 border border-gray-200 shadow-sm lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-3">Aging de contas a receber</h3>
              {errAging ? (
                <p className="text-sm text-red-600">{errAging}</p>
              ) : !aging ? (
                <p className="text-sm text-gray-500">Sem dados.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      Total em aberto: <b>{formatCurrency(aging.summary.totalOpen)}</b>
                    </span>
                    <span>
                      Taxa inadimplência: <b>{Number(aging.summary.overdueRate).toFixed(2)}%</b>
                    </span>
                    <span>
                      Recuperação (após venc.): <b>{Number(aging.summary.recoveryRate).toFixed(2)}%</b>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {Object.entries(aging.buckets || {}).map(([key, val]: [string, any]) => (
                      <div key={key} className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">{bucketLabels[key] ?? key}</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(val)}</p>
                        <p className="text-xs text-gray-500">
                          {Number(aging.bucketShare?.[key] ?? 0).toFixed(1)}% do aberto
                        </p>
                      </div>
                    ))}
                  </div>
                  {aging.byCustomer?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Clientes com maior atraso</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="pb-2">Cliente</th>
                              <th className="pb-2 text-right">Em aberto</th>
                              <th className="pb-2 text-right">Em atraso</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aging.byCustomer.slice(0, 8).map((row: any) => (
                              <tr key={row.customer} className="border-b border-gray-50">
                                <td className="py-2">{row.customer}</td>
                                <td className="py-2 text-right">{formatCurrency(row.openAmount)}</td>
                                <td className="py-2 text-right text-amber-800">
                                  {formatCurrency(row.overdueAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </section>

        <section id="indicadores-operacionais" className="scroll-mt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Indicadores operacionais</h2>
          {errDashboard && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Dashboard parcial: {errDashboard} Os blocos abaixo podem estar vazios.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {topCustomers.map((customer) => (
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
                            <div key={v.id} className="flex justify-between text-sm">
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
        </section>

        <section id="auditoria-perdas" className="scroll-mt-4">
          <Card className="overflow-hidden border-0 shadow-lg bg-white">
            <div className="p-5 border-b bg-gradient-to-r from-red-500 to-rose-600">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-lg bg-white/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Auditoria de perdas de estoque</h2>
                  <p className="text-rose-100 text-sm">Impacto financeiro e principais motivos</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {errLoss ? (
                <p className="text-sm text-red-600">{errLoss}</p>
              ) : !lossAudit ? (
                <p className="text-gray-500">Sem dados para o período.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    <span>
                      Movimentos (total): <b>{lossAudit.summary?.totalMovements ?? 0}</b>
                    </span>
                    <span>
                      Perdas: <b>{lossAudit.summary?.lossMovements ?? 0}</b>
                    </span>
                    <span>
                      Perda estimada: <b>{formatCurrency(lossAudit.summary?.estimatedTotalLoss ?? 0)}</b>
                    </span>
                    <span>
                      Devoluções no período: <b>{lossAudit.summary?.relatedReturns ?? 0}</b>
                    </span>
                    <span>
                      Cancelamentos de venda: <b>{lossAudit.summary?.relatedSaleCancellations ?? 0}</b>
                    </span>
                  </div>
                  {(lossAudit.byReason || []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2">Motivo</th>
                            <th className="pb-2 text-right">Qtd. mov.</th>
                            <th className="pb-2 text-right">Impacto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lossAudit.byReason || []).slice(0, 15).map((item: any) => (
                            <tr key={item.reason} className="border-b border-gray-50">
                              <td className="py-2 text-gray-800 max-w-md truncate" title={item.reason}>
                                {item.reason}
                              </td>
                              <td className="py-2 text-right">{item.count}</td>
                              <td className="py-2 text-right font-semibold text-rose-700">
                                {formatCurrency(item.impact)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma perda registrada no período.</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
