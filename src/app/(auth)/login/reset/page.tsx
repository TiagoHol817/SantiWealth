'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleReset() {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Contraseña actualizada. Redirigiendo...')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-6">Nueva Contraseña</h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-emerald-500"
        />
        {message && <p className="text-emerald-400 text-sm mb-4">{message}</p>}
        <button
          onClick={handleReset}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg"
        >
          Actualizar Contraseña
        </button>
      </div>
    </div>
  )
}