'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Plus, Edit, Trash2, UserCheck, UserX, Shield, User } from 'lucide-react'

type UserRole = 'CAIXA' | 'GERENTE' | 'ADMIN'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/users')
      const data = response.ok ? await response.json() : { users: [] }
      if (!response.ok) {
        toast.error((data as { error?: string }).error || 'Erro ao carregar usuários')
        return
      }
      setUsers((data as { users?: unknown[] }).users || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir usuário')
        return
      }

      setDeleteTargetId(null)
      loadUsers()
      toast.success('Usuário excluído.')
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast.error('Erro ao excluir usuário')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (user: any) => {
    try {
      const response = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao atualizar usuário')
        return
      }

      loadUsers()
      toast.success(user.active ? 'Usuário desativado.' : 'Usuário ativado.')
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      toast.error('Erro ao atualizar usuário')
    }
  }

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      CAIXA: 'Caixa',
      GERENTE: 'Gerente',
      ADMIN: 'Administrador',
    }
    return labels[role]
  }

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      CAIXA: 'bg-blue-100 text-blue-800',
      GERENTE: 'bg-yellow-100 text-yellow-800',
      ADMIN: 'bg-red-100 text-red-800',
    }
    return colors[role]
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerenciar usuários e permissões do sistema</p>
        </div>
        <Button onClick={() => {
          setSelectedUser(null)
          setShowModal(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-center py-8 text-gray-500">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhum usuário cadastrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Usuário</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Perfil</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Vendas</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">Cadastrado em</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{user.name}</td>
                    <td className="p-3 text-sm text-gray-600">{user.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{user._count?.sales || 0}</td>
                    <td className="p-3 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title={user.active ? 'Desativar' : 'Ativar'}
                        >
                          {user.active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowModal(true)
                          }}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(user.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowModal(false)
            setSelectedUser(null)
          }}
          onSave={() => {
            loadUsers()
            setShowModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Excluir usuário"
        message="Tem certeza que deseja excluir este usuário?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => { if (deleteTargetId) handleDelete(deleteTargetId) }}
      />
    </div>
  )
}

function UserModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    password: '',
    role: (user?.role || 'CAIXA') as UserRole,
    active: user?.active ?? true,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = user ? `/api/users/${user.id}` : '/api/users'
      const method = user ? 'PUT' : 'POST'

      // Se for edição e não tiver senha, remover do payload
      const payload: any = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        active: formData.active,
      }

      if (!user || formData.password) {
        payload.password = formData.password
      }

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao salvar usuário')
        return
      }

      toast.success(user ? 'Usuário atualizado.' : 'Usuário cadastrado.')
      onSave()
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      toast.error('Erro ao salvar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">
          {user ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Usuário (login)"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <Input
            label={user ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!user}
            minLength={6}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perfil
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full p-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="CAIXA">Caixa</option>
              <option value="GERENTE">Gerente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Usuário ativo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" onClick={onClose} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
