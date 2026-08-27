'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Package, CheckCircle, XCircle, Clock } from 'lucide-react'
import { NewConsignmentModal } from '@/components/consignments/NewConsignmentModal'
import { ReturnConsignmentModal } from '@/components/consignments/ReturnConsignmentModal'
import { CompleteConsignmentModal } from '@/components/consignments/CompleteConsignmentModal'

export default function ConsignmentsPage() {
  const [consignments, setConsignments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newModal, setNewModal] = useState(false)
  const [returnModal, setReturnModal] = useState<{ open: boolean; consignment: any | null }>({
    open: false,
    consignment: null,
  })
  const [completeModal, setCompleteModal] = useState<{ open: boolean; consignment: any | null }>({
    open: false,
    consignment: null,
  })

  useEffect(() => {
    loadConsignments()
  }, [])

  const loadConsignments = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/consignments')
      const data = await response.json()
      setConsignments(data.consignments || [])
    } catch (error) {
      console.error('Erro ao carregar consignados:', error)
      toast.error('Erro ao carregar consignados')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este consignado? O estoque será devolvido.')) {
      return
    }

    try {
      const response = await apiFetch(`/api/consignments/${id}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao cancelar consignado')
        return
      }

      toast.success('Consignado cancelado com sucesso')
      loadConsignments()
    } catch (error) {
      console.error('Erro ao cancelar:', error)
      toast.error('Erro ao cancelar consignado')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; className: string; icon: any } } = {
      SENT: { label: 'Enviado', className: 'bg-blue-100 text-blue-800', icon: Package },
      PARTIAL_RETURN: { label: 'Retorno Parcial', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      COMPLETED: { label: 'Finalizado', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800', icon: XCircle },
    }
    const badge = badges[status] || badges.SENT
    const Icon = badge.icon
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const calculateSoldItems = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.quantity - item.returned), 0)
  }

  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => {
      const sold = item.quantity - item.returned
      return sum + (parseFloat(item.unitPrice) * sold)
    }, 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consignados</h1>
          <p className="text-gray-600 mt-1">Gerencie peças enviadas para clientes</p>
        </div>
        <Button onClick={() => setNewModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Consignado
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : consignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhum consignado encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Cliente</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Data Envio</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Itens</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Vendidos</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Total</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {consignments.map((consignment) => (
                  <tr key={consignment.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{consignment.customer.name}</div>
                      <div className="text-sm text-gray-500">{consignment.customer.phone}</div>
                    </td>
                    <td className="p-3 text-sm">{formatDate(consignment.sentDate)}</td>
                    <td className="p-3 text-sm">{consignment.items.length} itens</td>
                    <td className="p-3 text-sm font-medium">
                      {calculateSoldItems(consignment.items)} peças
                    </td>
                    <td className="p-3 text-sm font-medium">
                      {formatCurrency(calculateTotal(consignment.items))}
                    </td>
                    <td className="p-3">{getStatusBadge(consignment.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        {(consignment.status === 'SENT' || consignment.status === 'PARTIAL_RETURN') && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => setReturnModal({ open: true, consignment })}
                            >
                              Registrar Retorno
                            </Button>
                            <Button
                              onClick={() => setCompleteModal({ open: true, consignment })}
                            >
                              Finalizar
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleCancel(consignment.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {consignment.status === 'COMPLETED' && (
                          <span className="text-sm text-gray-500">Venda gerada</span>
                        )}
                        {consignment.status === 'CANCELLED' && (
                          <span className="text-sm text-gray-500">Cancelado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {newModal && (
        <NewConsignmentModal
          onClose={() => setNewModal(false)}
          onSuccess={() => {
            setNewModal(false)
            loadConsignments()
          }}
        />
      )}

      {returnModal.open && returnModal.consignment && (
        <ReturnConsignmentModal
          consignment={returnModal.consignment}
          onClose={() => setReturnModal({ open: false, consignment: null })}
          onSuccess={() => {
            setReturnModal({ open: false, consignment: null })
            loadConsignments()
          }}
        />
      )}

      {completeModal.open && completeModal.consignment && (
        <CompleteConsignmentModal
          consignment={completeModal.consignment}
          onClose={() => setCompleteModal({ open: false, consignment: null })}
          onSuccess={() => {
            setCompleteModal({ open: false, consignment: null })
            loadConsignments()
          }}
        />
      )}
    </div>
  )
}
