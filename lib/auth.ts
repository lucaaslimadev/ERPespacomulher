import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

export { UserRole }

// Em produção JWT_SECRET é obrigatório; em dev permite fallback para facilitar uso local
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'dev-fallback-only')
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production')
}
const JWT_SECRET_SAFE = JWT_SECRET || 'dev-fallback-only'

export interface TokenPayload {
  userId: string
  username: string
  role: UserRole
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET_SAFE, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET_SAFE) as TokenPayload
  } catch {
    return null
  }
}

export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    CAIXA: 1,
    GERENTE: 2,
    ADMIN: 3,
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
