'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { clearAuthToken } from '@/lib/api'
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  BarChart3,
  LogOut,
  Menu,
  LayoutDashboard,
  CreditCard,
  FileText,
  Building2,
  Receipt,
} from 'lucide-react'
import { useState } from 'react'

const ROLE_LEVEL: Record<string, number> = {
  CAIXA: 1,
  GERENTE: 2,
  ADMIN: 3,
}

function getRoleLevel(role: string): number {
  return ROLE_LEVEL[role] ?? 0
}

interface SidebarProps {
  userRole: string
  userName: string
}

// Controle de acesso: cada item com role mínima (CAIXA < GERENTE < ADMIN)
const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'CAIXA' as const },
  { href: '/dashboard/pdv', label: 'PDV', icon: ShoppingCart, role: 'CAIXA' as const },
  { href: '/dashboard/products', label: 'Produtos', icon: Package, role: 'CAIXA' as const },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users, role: 'CAIXA' as const },
  { href: '/dashboard/suppliers', label: 'Fornecedores', icon: Building2, role: 'CAIXA' as const },
  { href: '/dashboard/financial', label: 'Financeiro', icon: DollarSign, role: 'GERENTE' as const },
  { href: '/dashboard/accounts-payable', label: 'Contas a Pagar', icon: FileText, role: 'GERENTE' as const },
  { href: '/dashboard/accounts-receivable', label: 'Contas a Receber', icon: CreditCard, role: 'GERENTE' as const },
  { href: '/dashboard/fixed-expenses', label: 'Despesas Fixas', icon: DollarSign, role: 'GERENTE' as const },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3, role: 'CAIXA' as const },
  { href: '/dashboard/sales', label: 'Vendas', icon: Receipt, role: 'GERENTE' as const },
  { href: '/dashboard/users', label: 'Usuários', icon: Users, role: 'ADMIN' as const },
]

export function Sidebar({ userRole, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  const userLevel = getRoleLevel(userRole)

  const visibleItems = menuItems.filter((item) => {
    const itemLevel = getRoleLevel(item.role)
    return userLevel >= itemLevel
  })

  const handleLogout = async () => {
    clearAuthToken()
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/login'
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
        suppressHydrationWarning
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">ERP Espaço Mulher</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
                aria-label="Fechar menu"
              >
                <span suppressHydrationWarning><Menu className="w-5 h-5" aria-hidden /></span>
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2" suppressHydrationWarning>
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <span className="flex items-center justify-center [&_svg]:shrink-0" suppressHydrationWarning>
                    <Icon className="w-5 h-5" aria-hidden />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Usuário</p>
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span suppressHydrationWarning><LogOut className="w-5 h-5" aria-hidden /></span>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-gray-900 text-white p-2 rounded-lg"
          aria-label="Abrir menu"
        >
          <span suppressHydrationWarning><Menu className="w-5 h-5" aria-hidden /></span>
        </button>
      )}
    </>
  )
}
