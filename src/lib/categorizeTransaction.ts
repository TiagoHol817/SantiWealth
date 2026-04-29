'use client'

// src/lib/categorizeTransaction.ts
// Categorización basada en reglas almacenadas en DB.
// Carga reglas globales + personales del usuario, las cachea en memoria
// por sesión de browser, y aplica la de mayor prioridad que coincida.

import { createBrowserClient } from '@supabase/ssr'

export interface CategoryRule {
  keyword:    string
  match_type: 'contains' | 'starts_with' | 'exact'
  category:   string
  priority:   number
}

let cachedRules: CategoryRule[] | null = null

export async function loadCategoryRules(): Promise<CategoryRule[]> {
  if (cachedRules) return cachedRules

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [{ data: global }, { data: user }] = await Promise.all([
    supabase.from('category_rules_global').select('keyword,match_type,category,priority'),
    supabase.from('category_rules_user').select('keyword,match_type,category,priority'),
  ])

  // Reglas de usuario tienen prioridad mayor por defecto (20 vs 10),
  // pero el campo priority permite sobreescribir en casos concretos.
  cachedRules = [...(global ?? []), ...(user ?? [])] as CategoryRule[]
  cachedRules.sort((a, b) => b.priority - a.priority)

  return cachedRules
}

export function categorizeTransaction(
  description: string,
  rules: CategoryRule[]
): string {
  const d = description.toUpperCase()

  for (const rule of rules) {
    const kw    = rule.keyword.toUpperCase()
    const match =
      rule.match_type === 'exact'       ? d === kw :
      rule.match_type === 'starts_with' ? d.startsWith(kw) :
                                          d.includes(kw)
    if (match) return rule.category
  }

  return 'Otro'
}

export function invalidateCategoryRulesCache() {
  cachedRules = null
}
