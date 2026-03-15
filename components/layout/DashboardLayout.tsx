import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { PermissionGuard } from './PermissionGuard'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { AUTH } from '@/lib/constants'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH.TOKEN_COOKIE)?.value || cookieStore.get(AUTH.BEARER_COOKIE)?.value

  if (!token) {
    redirect('/login')
  }

  const payload = verifyToken(token)
  if (!payload) {
    redirect('/login')
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
      },
    })

    if (!user || !user.active) {
      redirect('/login')
    }

    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userRole={user.role} userName={user.name} />
        <main className="flex-1 overflow-auto lg:ml-64" suppressHydrationWarning>
          <PermissionGuard userRole={user.role}>
            {children}
          </PermissionGuard>
        </main>
      </div>
    )
  } catch (error) {
    console.error('[DashboardLayout] Erro ao buscar usuário no banco:', error)
    throw error
  }
}
