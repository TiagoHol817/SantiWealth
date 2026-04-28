/**
 * Utilidades de sanitización y validación de entrada
 * Previene inyección SQL, XSS y manipulación de datos
 */

// ── Sanitizar texto libre ────────────────────────────────
export function sanitizeText(value: string, maxLength = 200): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .slice(0, maxLength)
    // Eliminar caracteres de control
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escapar caracteres HTML peligrosos
    .replace(/[<>'"&]/g, (c) => ({
      '<': '&lt;', '>': '&gt;',
      "'": '&#39;', '"': '&quot;',
      '&': '&amp;',
    }[c] ?? c))
}

// ── Sanitizar monto numérico ─────────────────────────────
export function sanitizeAmount(value: string | number): number {
  const raw = String(value)
    .replace(/\./g, '')   // quitar separadores de miles colombianos
    .replace(/,/g, '.')   // convertir coma decimal a punto
    .replace(/[^\d.]/g, '') // solo dígitos y punto
  const num = parseFloat(raw)
  if (isNaN(num) || num < 0) return 0
  if (num > 999_999_999_999) return 0 // max 1 billón COP
  return Math.round(num * 100) / 100
}

// ── Sanitizar fecha ──────────────────────────────────────
export function sanitizeDate(value: string): string | null {
  if (!value) return null
  // Solo formato YYYY-MM-DD
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match
  const year = parseInt(y)
  const month = parseInt(m)
  const day = parseInt(d)
  if (year < 2000 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return `${y}-${m}-${d}`
}

// ── Sanitizar categoría ──────────────────────────────────
export function sanitizeCategory(value: string): string {
  return sanitizeText(value, 100)
}

// ── Validar UUID ─────────────────────────────────────────
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// ── Sanitizar nombre de fuente de ingreso ────────────────
export function sanitizeSourceName(value: string): string {
  return sanitizeText(value, 80)
}

// ── Parsear COP con separadores colombianos ──────────────
export function parseCOP(value: string): number {
  // Formato colombiano: 1.000.000 o 1000000
  const clean = String(value).replace(/\./g, '').replace(/,/g, '').trim()
  const num = parseInt(clean, 10)
  if (isNaN(num) || num < 0) return 0
  return num
}