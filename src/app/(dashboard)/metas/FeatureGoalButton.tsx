'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PinOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

interface Props {
  id:          string
  isFeatured:  boolean
  goalName:    string
}

export default function FeatureGoalButton({ id, isFeatured, goalName }: Props) {
  const [loading, setLoading] = useState(false)
  const router    = useRouter()
  const { toast } = useToast()

  async function toggle() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión expirada')

      if (!isFeatured) {
        // Quitar destacado de todas las demás
        await supabase.from('goals')
          .update({ is_featured: false })
          .eq('user_id', user.id)
          .eq('is_featured', true)
        // Destacar esta
        const { error } = await supabase.from('goals')
          .update({ is_featured: true })
          .eq('id', id)
        if (error) throw error
        toast.success('Compromiso destacado', `"${goalName}" aparece ahora en tu Dashboard.`)
      } else {
        const { error } = await supabase.from('goals')
          .update({ is_featured: false })
          .eq('id', id)
        if (error) throw error
        toast.success('Compromiso removido', `"${goalName}" ya no aparece en el Dashboard.`)
      }

      router.refresh()
    } catch {
      toast.error('No se pudo actualizar', 'Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isFeatured ? 'Quitar del Dashboard' : 'Mostrar en Dashboard'}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
      style={{
        backgroundColor: isFeatured ? '#6366f120' : 'transparent',
        color:           isFeatured ? '#6366f1'   : '#4b5563',
        border:          `1px solid ${isFeatured ? '#6366f140' : '#2a3040'}`,
        opacity:         loading ? 0.5 : 1,
      }}>
      {isFeatured
        ? <PinOff size={13} />
        : <Pin   size={13} />
      }
    </button>
  )
}