'use client'

export default function ReportesActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}
      >
        📄 Exportar PDF
      </button>
      <button
        onClick={() => {
          const url = window.location.href
          navigator.clipboard?.writeText(url).then(() => {
            alert('URL copiada al portapapeles')
          }).catch(() => {
            alert('Copia la URL de tu navegador para compartir')
          })
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}
      >
        📊 Compartir
      </button>
    </div>
  )
}
