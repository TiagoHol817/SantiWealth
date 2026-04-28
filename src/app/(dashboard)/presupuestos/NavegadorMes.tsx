'use client'
import { useRouter } from 'next/navigation'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function NavegadorMes({ mes, year }: { mes: number; year: number }) {
  const router = useRouter()

  function navegar(nuevoMes: number, nuevoYear: number) {
    router.push(`/presupuestos?mes=${nuevoMes}&year=${nuevoYear}`)
  }

  function anterior() {
    if (mes === 1) navegar(12, year - 1)
    else navegar(mes - 1, year)
  }

  function siguiente() {
    if (mes === 12) navegar(1, year + 1)
    else navegar(mes + 1, year)
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={anterior}
        className="px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#e5e7eb' }}>
        ← Anterior
      </button>
      <span className="text-white font-medium" style={{ minWidth: '160px', textAlign: 'center' }}>
        {MESES[mes - 1]} {year}
      </span>
      <button onClick={siguiente}
        className="px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#e5e7eb' }}>
        Siguiente →
      </button>
    </div>
  )
}