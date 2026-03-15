/**
 * Controle de acesso por perfil:
 * - ADMIN: acesso a todos os módulos
 * - GERENTE: dashboard, pdv, produtos, clientes, fornecedores, financeiro, contas, despesas, relatórios, vendas
 * - CAIXA: apenas dashboard, pdv, produtos, clientes, fornecedores
 */

export type AppRole = 'CAIXA' | 'GERENTE' | 'ADMIN'

const ROLE_LEVEL: Record<AppRole, number> = {
  CAIXA: 1,
  GERENTE: 2,
  ADMIN: 3,
}

/** Mínima role necessária para acessar cada path (exato ou prefixo). */
const ROUTE_PERMISSIONS: { path: string; role: AppRole }[] = [
  { path: '/dashboard', role: 'CAIXA' },
  { path: '/dashboard/pdv', role: 'CAIXA' },
  { path: '/dashboard/products', role: 'CAIXA' },
  { path: '/dashboard/customers', role: 'CAIXA' },
  { path: '/dashboard/suppliers', role: 'CAIXA' },
  { path: '/dashboard/financial', role: 'GERENTE' },
  { path: '/dashboard/accounts-payable', role: 'GERENTE' },
  { path: '/dashboard/accounts-receivable', role: 'GERENTE' },
  { path: '/dashboard/fixed-expenses', role: 'GERENTE' },
  { path: '/dashboard/reports', role: 'GERENTE' },
  { path: '/dashboard/sales', role: 'GERENTE' },
  { path: '/dashboard/users', role: 'ADMIN' },
  { path: '/dashboard/categories', role: 'ADMIN' },
]

function getRoleLevel(role: string): number {
  return ROLE_LEVEL[role as AppRole] ?? 0
}

/** Verifica se a role do usuário pode acessar o path (exato ou começando com path). */
export function canAccessPath(pathname: string, userRole: string): boolean {
  const userLevel = getRoleLevel(userRole)
  if (userLevel >= ROLE_LEVEL.ADMIN) return true

  // Encontrar a permissão mais específica que casa com o pathname
  const matches = ROUTE_PERMISSIONS.filter(
    (p) => pathname === p.path || pathname.startsWith(p.path + '/')
  )
  if (matches.length === 0) return false
  // Usar a mais específica (maior path length)
  const best = matches.sort((a, b) => b.path.length - a.path.length)[0]
  return userLevel >= getRoleLevel(best.role)
}

/** Retorna o nível da role (para comparar no menu). */
export function getRoleLevelForMenu(role: string): number {
  return getRoleLevel(role)
}

export { ROLE_LEVEL, ROUTE_PERMISSIONS }
