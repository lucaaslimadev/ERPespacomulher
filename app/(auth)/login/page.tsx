'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { setAuthToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Digite o usuário')
      return
    }
    if (!password) {
      setError('Digite a senha')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      })

      let data
      try {
        const text = await response.text()
        if (!text) {
          setError('Resposta vazia do servidor')
          setLoading(false)
          return
        }
        data = JSON.parse(text)
      } catch {
        setError('Resposta inválida do servidor')
        setLoading(false)
        return
      }

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login')
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Resposta inválida do servidor')
        setLoading(false)
        return
      }

      if (data.token) setAuthToken(data.token)
      window.location.replace('/dashboard')
    } catch (err) {
      console.error('❌ Erro no login:', err)
      setError(`Erro ao conectar com o servidor: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ERP Espaço Mulher</h1>
          <p className="text-gray-600 mt-2">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Input
              label="Usuário"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              inputMode="text"
            />
          </div>

          <div>
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          
          {loading && (
            <p className="text-sm text-center text-gray-500 mt-2">
              Aguarde, redirecionando...
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
