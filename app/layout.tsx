import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ERP Espaço Mulher',
  description: 'Sistema ERP para loja de varejo de roupas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  )
}
