'use client'

export default function ReportesActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.print()}
        className="btn-primary shimmer-border flex items-center gap-2 px-3 py-2 text-sm"
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
        className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
      >
        📊 Compartir
      </button>
    </div>
  )
}
