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
  PackageCheck,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'

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
  { href: '/dashboard/consignments', label: 'Consignados', icon: PackageCheck, role: 'CAIXA' as const },
  { href: '/dashboard/financial', label: 'Financeiro', icon: DollarSign, role: 'GERENTE' as const },
  { href: '/dashboard/accounts-payable', label: 'Contas a Pagar', icon: FileText, role: 'GERENTE' as const },
  { href: '/dashboard/accounts-receivable', label: 'Crediário', icon: CreditCard, role: 'GERENTE' as const },
  { href: '/dashboard/fixed-expenses', label: 'Despesas Fixas', icon: DollarSign, role: 'GERENTE' as const },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3, role: 'CAIXA' as const },
  { href: '/dashboard/sales', label: 'Vendas', icon: Receipt, role: 'GERENTE' as const },
  { href: '/dashboard/users', label: 'Usuários', icon: Users, role: 'ADMIN' as const },
]

export function Sidebar({ userRole, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Evita hydration mismatch: só renderiza estado interativo após montar no client
  useEffect(() => {
    setMounted(true)
  }, [])

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
      {/* Botão hamburguer (mobile) - sempre visível em LG:hidden */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-gray-900 text-white p-2 rounded-lg"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {/* Overlay mobile - só visível quando aberto */}
      {mounted && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300',
          // Desktop: sempre visível. Mobile: controlado por isOpen
          'lg:translate-x-0',
          mounted && isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <h1 className="text-xl font-bold text-white">Espaço Mulher</h1>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Navegação com scroll */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Rodapé do usuário */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <div className="mb-3">
            <p className="text-xs text-gray-400">Usuário</p>
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}
