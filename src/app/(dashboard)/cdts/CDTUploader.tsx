'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

type CDTData = {
  id?: string
  nombre: string; capital: string; apertura: string; vencimiento: string
  tasa_ea: string; tasa_nominal: string; plazo_dias: string; interes_periodo: string
}

const EMPTY: CDTData = {
  nombre: '', capital: '', apertura: '', vencimiento: '',
  tasa_ea: '', tasa_nominal: '', plazo_dias: '', interes_periodo: ''
}

// Parsea números con puntos como separadores de miles: "10.000.000" → 10000000
const parseCOP = (v: string) => Number(v.toString().replace(/\./g, '').replace(/,/g, ''))

export default function CDTUploader({ cdts }: { cdts?: { id: string; name: string; notes: any; current_balance: number }[] }) {
  const [mode, setMode]             = useState<'none'|'add'|'edit'>('none')
  const [showManage, setShowManage] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string|null>(null)
  const [form, setForm]             = useState<CDTData>(EMPTY)
  const router                      = useRouter()
  const { toast }                   = useToast()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function openEdit(cdt: { id: string; name: string; notes: any; current_balance: number }) {
    const meta = typeof cdt.notes === 'string' ? JSON.parse(cdt.notes) : cdt.notes
    setForm({
      id:              cdt.id,
      nombre:          cdt.name,
      capital:         String(cdt.current_balance),
      apertura:        meta.apertura,
      vencimiento:     meta.vencimiento,
      tasa_ea:         String(meta.tasa_ea),
      tasa_nominal:    String(meta.tasa_nominal),
      plazo_dias:      String(meta.plazo_dias ?? ''),
      interes_periodo: String(meta.interes_periodo ?? ''),
    })
    setMode('edit')
  }

  async function guardar() {
    setSaving(true)
    try {
      const supabase = createClient()
      const notes = JSON.stringify({
        apertura:        form.apertura,
        vencimiento:     form.vencimiento,
        tasa_ea:         Number(form.tasa_ea),
        tasa_nominal:    Number(form.tasa_nominal),
        plazo_dias:      parseCOP(form.plazo_dias),
        interes_periodo: parseCOP(form.interes_periodo),
      })

      if (mode === 'edit' && form.id) {
        const { error } = await supabase.from('accounts').update({
          name:            form.nombre,
          current_balance: parseCOP(form.capital),
          notes,
        }).eq('id', form.id)

        if (error) throw error
        toast.success('CDT actualizado', `${form.nombre} se guardó correctamente.`)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('accounts').insert({
          user_id:         user!.id,
          name:            form.nombre,
          type:            'other',
          currency:        'COP',
          current_balance: parseCOP(form.capital),
          notes,
        })

        if (error) throw error
        toast.success('CDT agregado', `${form.nombre} fue creado exitosamente.`)
      }

      setMode('none')
      setForm(EMPTY)
      router.refresh()
    } catch (e: any) {
      toast.error(
        'Error al guardar CDT',
        'Ocurrió un problema al guardar. Por favor intenta de nuevo.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id: string, nombre?: string) {
    if (!confirm('¿Eliminar este CDT?')) return
    setDeleting(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('accounts').delete().eq('id', id)

      if (error) throw error
      toast.success('CDT eliminado', nombre ? `${nombre} fue eliminado.` : 'CDT eliminado correctamente.')
      setMode('none')
      router.refresh()
    } catch (e: any) {
      toast.error(
        'Error al eliminar CDT',
        'No se pudo eliminar. Por favor intenta de nuevo.'
      )
    } finally {
      setDeleting(null)
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '8px 12px', fontSize: '13px', width: '100%', outline: 'none'
  }
  const lbl = {
    color: '#6b7280', fontSize: '11px', marginBottom: '4px',
    display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em'
  }

  const campos = [
    ['capital',         'Capital (COP)',             '10000000'],
    ['apertura',        'Fecha apertura',             '2026-03-03'],
    ['vencimiento',     'Fecha vencimiento',          '2026-05-04'],
    ['tasa_ea',         'Tasa EA (%)',                '8.6'],
    ['tasa_nominal',    'Tasa Nominal (%)',           '8.31'],
    ['plazo_dias',      'Plazo (días)',               '61'],
    ['interes_periodo', 'Interés del período (COP)',  '140770'],
  ]

  return (
    <div className="flex items-center gap-2">

      {/* Dropdown Modificar CDT */}
      {cdts && cdts.length > 0 && mode === 'none' && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowManage(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#6366f1' }}>
            <Pencil size={14} /> Modificar CDT <ChevronDown size={13} />
          </button>

          {showManage && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minWidth: '240px' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e2535' }}>
                  <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selecciona un CDT
                  </p>
                </div>
                {cdts.map((cdt, i) => (
                  <div key={cdt.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all"
                    style={{ borderBottom: i < cdts.length - 1 ? '1px solid #1e2535' : 'none' }}>
                    <span style={{ color: '#e5e7eb', fontSize: '13px' }}>{cdt.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { openEdit(cdt); setShowManage(false) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                        style={{ color: '#6366f1', border: '1px solid #2a3040' }}>
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => { eliminar(cdt.id, cdt.name); setShowManage(false) }}
                        disabled={deleting === cdt.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-900/30 transition-all"
                        style={{ color: '#ef4444', border: '1px solid #2a3040' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Botón Agregar CDT */}
      {mode === 'none' && (
        <button
          onClick={() => { setForm(EMPTY); setMode('add') }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#10b981' }}>
          <Plus size={15} /> Agregar CDT
        </button>
      )}

      {/* Modal formulario */}
      {(mode === 'add' || mode === 'edit') && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setMode('none')} />
          <div className="fixed z-50 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', maxHeight: '90vh' }}>

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">
                {mode === 'edit' ? 'Editar CDT' : 'Nuevo CDT'}
              </h3>
              <button onClick={() => setMode('none')}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                style={{ color: '#6b7280' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej: CDT Banco #1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {campos.map(([key, label, placeholder]) => (
                  <div key={key} className={key === 'capital' ? 'col-span-2' : ''}>
                    <label style={lbl}>{label}</label>
                    <input
                      style={{ ...inp, colorScheme: key === 'apertura' || key === 'vencimiento' ? 'dark' : undefined }}
                      type={key === 'apertura' || key === 'vencimiento' ? 'date' : 'text'}
                      placeholder={placeholder}
                      value={form[key as keyof CDTData] as string}
                      onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-5">
              {mode === 'edit' ? (
                <button onClick={() => eliminar(form.id!, form.nombre)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-900/30"
                  style={{ color: '#ef4444', border: '1px solid #ef444430' }}>
                  Eliminar CDT
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setMode('none')}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ backgroundColor: '#0f1117', color: '#6b7280' }}>
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Agregar CDT'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}