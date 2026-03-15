import { UserRole, PaymentMethod, StockType, FinancialType } from '@prisma/client'

export type { UserRole, PaymentMethod, StockType, FinancialType }

export interface ProductWithVariations {
  id: string
  name: string
  description: string | null
  categoryId: string
  category: {
    id: string
    name: string
  }
  price: number
  cost: number
  barcode: string | null
  sku: string | null
  active: boolean
  variations: Array<{
    id: string
    color: string
    size: string
    quantity: number
  }>
}

export interface CartItem {
  productId: string
  variationId: string
  productName: string
  color: string
  size: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface SaleFormData {
  customerId?: string
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
}
