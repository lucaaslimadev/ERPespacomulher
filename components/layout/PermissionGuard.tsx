'use client'

import { useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const ROLE_LEVEL: Record<string, number> = {
  CAIXA: 1,
  GERENTE: 2,
  ADMIN: 3,
}

const ROUTE_PERMISSIONS: { path: string; role: string }[] = [
  { path: '/dashboard/users', role: 'ADMIN' },
  { path: '/dashboard/categories', role: 'ADMIN' },
  { path: '/dashboard/sales', role: 'GERENTE' },
  { path: '/dashboard/fixed-expenses', role: 'GERENTE' },
  { path: '/dashboard/accounts-receivable', role: 'GERENTE' },
  { path: '/dashboard/accounts-payable', role: 'GERENTE' },
  { path: '/dashboard/financial', role: 'GERENTE' },
  { path: '/dashboard/reports', role: 'CAIXA' },
  { path: '/dashboard/suppliers', role: 'CAIXA' },
  { path: '/dashboard/customers', role: 'CAIXA' },
  { path: '/dashboard/products', role: 'CAIXA' },
  { path: '/dashboard/pdv', role: 'CAIXA' },
  { path: '/dashboard', role: 'CAIXA' },
]

function canAccessPath(pathname: string, userRole: string): boolean {
  const userLevel = ROLE_LEVEL[userRole] ?? 0
  if (userLevel >= ROLE_LEVEL.ADMIN) return true
  const matches = ROUTE_PERMISSIONS.filter(
    (p) => pathname === p.path || pathname.startsWith(p.path + '/')
  )
  if (matches.length === 0) return false
  const best = matches.sort((a, b) => b.path.length - a.path.length)[0]
  return userLevel >= (ROLE_LEVEL[best.role] ?? 0)
}

interface PermissionGuardProps {
  userRole: string
  children: ReactNode
}

export function PermissionGuard({ userRole, children }: PermissionGuardProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname || pathname === '/login') return
    if (!canAccessPath(pathname, userRole)) {
      router.replace('/dashboard')
    }
  }, [pathname, userRole, router])

  return <>{children}</>
}
