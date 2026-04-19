'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import WealtHostBrand from '@/components/WealtHostBrand'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0f1117' }}>
      <div className="w-full max-w-sm rounded-xl p-8 border"
        style={{ backgroundColor: '#1a1f2e', borderColor: '#2a3040' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-base"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #b8922a)', color: '#000' }}>
              W
            </div>
            <WealtHostBrand size="lg" />
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Personal Finance</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#2d1515', border: '1px solid #5a2020', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#9ca3af' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
              style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#9ca3af' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
              style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040' }}
            />
          </div>

          <div className="text-right">
            <Link href="/login/reset" className="text-xs hover:underline"
              style={{ color: '#D4AF37' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117', fontWeight: 700, boxShadow: '0 2px 14px #D4AF3730' }}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}