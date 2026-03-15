'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Search, Eye, Download, X, RefreshCw } from 'lucide-react'

function formatPaymentMethod(method: string): string {
  const methods: { [key: string]: string } = {
    'DINHEIRO': 'Dinheiro',
    'PIX': 'PIX',
    'CREDITO_AVISTA': 'Crédito à Vista',
    'CREDITO_PARCELADO': 'Crédito Parcelado',
    'DEBITO': 'Débito',
    'MISTO': 'Pagamento Misto'
  }
  return methods[method] || method
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<any>(null)

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    // Incluir hoje no final da data
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)
    setEndDate(endOfToday.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadSales()
    }
  }, [startDate, endDate])

  // Atualizar automaticamente a cada 30 segundos
  useEffect(() => {
    if (startDate && endDate) {
      const interval = setInterval(() => {
        loadSales()
      }, 30000) // 30 segundos
      return () => clearInterval(interval)
    }
  }, [startDate, endDate, search])

  const loadSales = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (search) params.append('search', search)
      
      const response = await apiFetch(`/api/sales?${params}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string }
        toast.error(err?.error || 'Erro ao carregar vendas')
        return
      }
      const data = await response.json()
      setSales(data.sales || [])
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadSales()
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Data', 'Cliente', 'Vendedor', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Pagamento', 'Status']
    const rows = sales.map(sale => [
      sale.id,
      formatDate(sale.createdAt),
      sale.customer?.name || 'Não identificado',
      sale.user?.name || 'N/A',
      sale.items.length,
      formatCurrency(parseFloat(sale.subtotal.toString())),
      formatCurrency(parseFloat(sale.discount.toString())),
      formatCurrency(parseFloat(sale.total.toString())),
      sale.paymentMethod,
      sale.cancelled ? 'Cancelada' : 'Ativa'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vendas_${startDate}_${endDate}.csv`
    link.click()
  }

  const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0)
  const totalCount = sales.length
  const averageTicket = totalCount > 0 ? totalSales / totalCount : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Vendas</h1>
          <p className="text-gray-600 mt-1">Todas as vendas realizadas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadSales} variant="secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={exportToCSV} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
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
          <Input
            label="Buscar (Cliente, Vendedor, ID)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Digite para buscar..."
          />
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <p className="text-sm text-gray-600">Total de Vendas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Valor Total</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">
            {formatCurrency(totalSales)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Ticket Médio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(averageTicket)}
          </p>
        </Card>
      </div>

      {/* Lista de Vendas */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Vendas</h2>
        {loading ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : sales.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhuma venda encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Data</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Vendedor</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Itens</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Pagamento</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono text-gray-600">
                      {sale.id.substring(0, 8)}...
                    </td>
                    <td className="p-3 text-sm">{formatDate(sale.createdAt)}</td>
                    <td className="p-3 text-sm">
                      {sale.customer?.name || (
                        <span className="text-gray-400">Não identificado</span>
                      )}
                    </td>
                    <td className="p-3 text-sm">{sale.user?.name || 'N/A'}</td>
                    <td className="p-3 text-sm">{sale.items.length}</td>
                    <td className="p-3 text-sm text-right font-medium">
                      {formatCurrency(parseFloat(sale.total.toString()))}
                    </td>
                    <td className="p-3 text-sm">
                      <div>
                        {sale.paymentMethod === 'MISTO' && sale.payments && sale.payments.length > 0 ? (
                          <div>
                            <div className="font-medium">Pagamento Misto</div>
                            <div className="text-xs text-gray-500">
                              {sale.payments.map((p: any, idx: number) => (
                                <span key={idx}>
                                  {p.paymentMethod === 'DINHEIRO' ? 'Dinheiro' :
                                   p.paymentMethod === 'PIX' ? 'PIX' :
                                   p.paymentMethod === 'CREDITO_AVISTA' ? 'Crédito à Vista' :
                                   p.paymentMethod === 'CREDITO_PARCELADO' ? `Crédito (${p.installments || 0}x)` :
                                   p.paymentMethod === 'DEBITO' ? 'Débito' :
                                   p.paymentMethod}: {formatCurrency(parseFloat(p.amount.toString()))}
                                  {idx < sale.payments.length - 1 ? ' + ' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : sale.paymentMethod === 'CREDITO_PARCELADO' && sale.installments && sale.installments.length > 0 ? (
                          <div>
                            <div className="font-medium">Crédito Parcelado ({sale.installments.length}x)</div>
                            <div className="text-xs text-gray-500">
                              {sale.installments.length}x de {formatCurrency(parseFloat(sale.installments[0]?.amount?.toString() || '0'))}
                            </div>
                          </div>
                        ) : sale.paymentMethod === 'CREDITO_AVISTA' ? (
                          'Crédito à Vista'
                        ) : (
                          sale.paymentMethod === 'DINHEIRO' ? 'Dinheiro' :
                          sale.paymentMethod === 'PIX' ? 'PIX' :
                          sale.paymentMethod === 'DEBITO' ? 'Débito' :
                          sale.paymentMethod
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {sale.cancelled ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Cancelada
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Ativa
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1 text-primary-600 hover:text-primary-800"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes */}
      {selectedSale && (
        <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  )
}

function SaleDetailModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Detalhes da Venda</h2>
            <p className="text-sm text-gray-600">ID: {sale.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Data</p>
              <p className="font-medium">{formatDate(sale.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vendedor</p>
              <p className="font-medium">{sale.user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-medium">
                {sale.customer?.name || (
                  <span className="text-gray-400">Não identificado</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Forma de Pagamento</p>
              <div>
                {sale.paymentMethod === 'MISTO' && sale.payments && sale.payments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium">Pagamento Misto</p>
                    {sale.payments.map((payment: any, index: number) => (
                      <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {payment.paymentMethod === 'DINHEIRO' ? 'Dinheiro' :
                             payment.paymentMethod === 'PIX' ? 'PIX' :
                             payment.paymentMethod === 'CREDITO_AVISTA' ? 'Crédito à Vista' :
                             payment.paymentMethod === 'CREDITO_PARCELADO' ? `Crédito Parcelado (${payment.installments || 0}x)` :
                             payment.paymentMethod === 'DEBITO' ? 'Débito' :
                             payment.paymentMethod}
                          </span>
                          <span className="text-gray-700">
                            {formatCurrency(parseFloat(payment.amount.toString()))}
                          </span>
                        </div>
                        {payment.installments && payment.installments > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.installments}x de {formatCurrency(parseFloat(payment.amount.toString()) / payment.installments)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : sale.paymentMethod === 'CREDITO_PARCELADO' && sale.installments && sale.installments.length > 0 ? (
                  <div>
                    <p className="font-medium">Crédito Parcelado ({sale.installments.length}x)</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {sale.installments.length}x de {formatCurrency(parseFloat(sale.installments[0]?.amount?.toString() || '0'))}
                    </p>
                  </div>
                ) : sale.paymentMethod === 'CREDITO_AVISTA' ? (
                  <p className="font-medium">Crédito à Vista</p>
                ) : (
                  <p className="font-medium">
                    {sale.paymentMethod === 'DINHEIRO' ? 'Dinheiro' :
                     sale.paymentMethod === 'PIX' ? 'PIX' :
                     sale.paymentMethod === 'DEBITO' ? 'Débito' :
                     sale.paymentMethod}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">Itens da Venda</h3>
          <div className="space-y-2">
            {sale.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.variation.color} - {item.variation.size}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {item.quantity} x {formatCurrency(parseFloat(item.unitPrice.toString()))}
                  </p>
                  <p className="font-medium text-primary-600">
                    {formatCurrency(parseFloat(item.totalPrice.toString()))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(parseFloat(sale.subtotal.toString()))}</span>
          </div>
          {parseFloat(sale.discount.toString()) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Desconto:</span>
              <span className="font-medium">-{formatCurrency(parseFloat(sale.discount.toString()))}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-primary-600">
              {formatCurrency(parseFloat(sale.total.toString()))}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
