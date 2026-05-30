/**
 * seed-demo.ts
 * Idempotent demo data seeder for demo@wealthost.co
 * Run with: npx tsx src/scripts/seed-demo.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@wealthost.co'
const DEMO_PASSWORD = 'Demo2026!'
const DEMO_FULL_NAME = 'Carlos Demo'

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── STEP 1: Create or find demo user ───────────────────────────────────────

async function upsertDemoUser(): Promise<string> {
  console.log('\n📌 STEP 1 — Creating / finding demo user...')

  // Check if user already exists
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)

  const existing = list.users.find((u) => u.email === DEMO_EMAIL)
  if (existing) {
    console.log(`   ✅ User already exists: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEMO_FULL_NAME },
  })

  if (error) throw new Error(`createUser failed: ${error.message}`)
  console.log(`   ✅ User created: ${data.user.id}`)
  return data.user.id
}

// ─── STEP 2: Delete all existing demo data ──────────────────────────────────

async function purgeExistingData(userId: string) {
  console.log('\n🗑️  STEP 2 — Purging existing demo data...')

  const tables = [
    'budget_items',
    'budgets',
    'operational_costs',
    'investment_goals',
    'transactions',
    'categories',
    'accounts',
    'user_settings',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) console.warn(`   ⚠️  Could not delete from ${table}: ${error.message}`)
    else console.log(`   🗑️  Cleared ${table}`)
  }
}

// ─── STEP 3: Create user_settings + accounts ────────────────────────────────

async function seedAccounts(userId: string): Promise<Record<string, string>> {
  console.log('\n🏦 STEP 3 — Seeding user settings + accounts...')

  // user_settings (needed to pass onboarding gate)
  const { error: settingsErr } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      onboarding_completed: true,
      base_currency: 'COP',
      country: 'CO',
      accent_color: 'gold',
    },
    { onConflict: 'user_id' },
  )
  if (settingsErr) throw new Error(`user_settings upsert failed: ${settingsErr.message}`)
  console.log('   ✅ user_settings created')

  const accountDefs = [
    {
      key: 'bancolombia',
      name: 'Bancolombia Ahorros',
      type: 'bank',
      currency: 'COP',
      current_balance: 8_500_000,
      institution: 'Bancolombia',
      color: '#FFCB3C',
      icon: '🏦',
    },
    {
      key: 'nequi',
      name: 'Nequi',
      type: 'bank',
      currency: 'COP',
      current_balance: 1_200_000,
      institution: 'Bancolombia',
      color: '#7C3AED',
      icon: '📱',
    },
    {
      key: 'flandes',
      name: 'Deuda Apto Flandes',
      type: 'liability',
      currency: 'COP',
      current_balance: -239_000_000,
      institution: 'Banco de Bogotá',
      color: '#EF4444',
      icon: '🏠',
    },
  ]

  const ids: Record<string, string> = {}

  for (const def of accountDefs) {
    const { key, ...row } = def
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, ...row })
      .select('id')
      .single()

    if (error) throw new Error(`Account insert (${def.name}) failed: ${error.message}`)
    ids[key] = data.id
    console.log(`   ✅ Account: ${def.name}`)
  }

  return ids
}

// ─── STEP 4: Seed categories ─────────────────────────────────────────────────

async function seedCategories(userId: string): Promise<Record<string, string>> {
  console.log('\n🏷️  STEP 4 — Seeding categories...')

  const catDefs = [
    // income
    { key: 'salario', name: 'Salario', type: 'income', icon: '💼', color: '#10B981' },
    { key: 'freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#06B6D4' },
    // expense
    { key: 'vivienda', name: 'Vivienda', type: 'expense', icon: '🏠', color: '#F59E0B' },
    { key: 'alimentacion', name: 'Alimentación', type: 'expense', icon: '🍔', color: '#EF4444' },
    { key: 'transporte', name: 'Transporte', type: 'expense', icon: '🚌', color: '#8B5CF6' },
    { key: 'entretenimiento', name: 'Entretenimiento', type: 'expense', icon: '🎬', color: '#EC4899' },
    { key: 'salud', name: 'Salud', type: 'expense', icon: '⚕️', color: '#14B8A6' },
    // debt_payment
    { key: 'cuota_hipoteca', name: 'Cuota Hipoteca', type: 'debt_payment', icon: '🏠', color: '#DC2626' },
  ]

  const ids: Record<string, string> = {}

  for (const def of catDefs) {
    const { key, ...row } = def
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, ...row })
      .select('id')
      .single()

    if (error) throw new Error(`Category insert (${def.name}) failed: ${error.message}`)
    ids[key] = data.id
    console.log(`   ✅ Category: ${def.name}`)
  }

  return ids
}

// ─── STEP 5: Seed transactions (~50 over 90 days) ───────────────────────────

async function seedTransactions(
  userId: string,
  accountIds: Record<string, string>,
  categoryIds: Record<string, string>,
) {
  console.log('\n💸 STEP 5 — Seeding transactions...')

  type TxRow = {
    user_id: string
    account_id: string
    category_id?: string
    type: string
    amount: number
    currency: string
    description: string
    date: string
    liability_account_id?: string
  }

  const rows: TxRow[] = []

  // ── Monthly salary (3 months) ────────────────────────────────────────────
  for (let m = 0; m < 3; m++) {
    rows.push({
      user_id: userId,
      account_id: accountIds.bancolombia,
      category_id: categoryIds.salario,
      type: 'income',
      amount: 4_800_000,
      currency: 'COP',
      description: 'Salario mensual',
      date: daysAgo(m * 30 + 2),
    })
  }

  // ── Freelance (occasional) ───────────────────────────────────────────────
  rows.push({
    user_id: userId,
    account_id: accountIds.bancolombia,
    category_id: categoryIds.freelance,
    type: 'income',
    amount: 850_000,
    currency: 'COP',
    description: 'Proyecto web freelance',
    date: daysAgo(45),
  })
  rows.push({
    user_id: userId,
    account_id: accountIds.nequi,
    category_id: categoryIds.freelance,
    type: 'income',
    amount: 600_000,
    currency: 'COP',
    description: 'Consultoría diseño',
    date: daysAgo(18),
  })

  // ── Mortgage payment (3 months) ──────────────────────────────────────────
  for (let m = 0; m < 3; m++) {
    rows.push({
      user_id: userId,
      account_id: accountIds.bancolombia,
      category_id: categoryIds.cuota_hipoteca,
      type: 'debt_payment',
      amount: 1_850_000,
      currency: 'COP',
      description: 'Cuota hipoteca Apto Flandes',
      date: daysAgo(m * 30 + 5),
      liability_account_id: accountIds.flandes,
    })
  }

  // ── Rent / housing ───────────────────────────────────────────────────────
  for (let m = 0; m < 3; m++) {
    rows.push({
      user_id: userId,
      account_id: accountIds.bancolombia,
      category_id: categoryIds.vivienda,
      type: 'expense',
      amount: 900_000,
      currency: 'COP',
      description: 'Arriendo apartamento',
      date: daysAgo(m * 30 + 3),
    })
  }

  // ── Food / groceries (weekly ~12 entries) ────────────────────────────────
  const foodDescriptions = [
    'Mercado semanal',
    'Rappi — domicilio',
    'Restaurante almuerzo',
    'Panadería',
    'Supermercado Éxito',
    'Comida rápida',
  ]
  for (let w = 0; w < 12; w++) {
    rows.push({
      user_id: userId,
      account_id: randomBetween(0, 1) === 0 ? accountIds.bancolombia : accountIds.nequi,
      category_id: categoryIds.alimentacion,
      type: 'expense',
      amount: randomBetween(45_000, 180_000),
      currency: 'COP',
      description: foodDescriptions[w % foodDescriptions.length],
      date: daysAgo(w * 7 + randomBetween(0, 3)),
    })
  }

  // ── Transport ────────────────────────────────────────────────────────────
  const transportDesc = ['SITP mensual', 'Uber', 'Gasolina', 'Uber Eats envío']
  for (let i = 0; i < 8; i++) {
    rows.push({
      user_id: userId,
      account_id: accountIds.nequi,
      category_id: categoryIds.transporte,
      type: 'expense',
      amount: randomBetween(15_000, 120_000),
      currency: 'COP',
      description: transportDesc[i % transportDesc.length],
      date: daysAgo(randomBetween(1, 85)),
    })
  }

  // ── Entertainment ────────────────────────────────────────────────────────
  const entDesc = ['Netflix', 'Spotify', 'Cine', 'Videojuegos', 'Concierto']
  for (let i = 0; i < 6; i++) {
    rows.push({
      user_id: userId,
      account_id: accountIds.nequi,
      category_id: categoryIds.entretenimiento,
      type: 'expense',
      amount: randomBetween(20_000, 200_000),
      currency: 'COP',
      description: entDesc[i % entDesc.length],
      date: daysAgo(randomBetween(2, 88)),
    })
  }

  // ── Health ───────────────────────────────────────────────────────────────
  rows.push({
    user_id: userId,
    account_id: accountIds.bancolombia,
    category_id: categoryIds.salud,
    type: 'expense',
    amount: 65_000,
    currency: 'COP',
    description: 'Cita médica',
    date: daysAgo(22),
  })
  rows.push({
    user_id: userId,
    account_id: accountIds.bancolombia,
    category_id: categoryIds.salud,
    type: 'expense',
    amount: 38_500,
    currency: 'COP',
    description: 'Farmacia',
    date: daysAgo(55),
  })

  // ── Internal transfer (Bancolombia → Nequi) ──────────────────────────────
  rows.push({
    user_id: userId,
    account_id: accountIds.bancolombia,
    type: 'internal_transfer',
    amount: 500_000,
    currency: 'COP',
    description: 'Recarga Nequi',
    date: daysAgo(15),
  })

  // Batch insert
  const { error } = await supabase.from('transactions').insert(rows)
  if (error) throw new Error(`Transactions insert failed: ${error.message}`)
  console.log(`   ✅ ${rows.length} transactions inserted`)
}

// ─── STEP 6: Seed investment goals ──────────────────────────────────────────

async function seedGoals(userId: string, accountIds: Record<string, string>) {
  console.log('\n🎯 STEP 6 — Seeding investment goals...')

  const goals = [
    {
      name: 'Meta $100K USD Patrimonio',
      goal_type: 'investment',
      target_amount: 100_000,
      target_currency: 'USD',
      current_amount: 8_200,
      color: '#00D4AA',
      icon: '🚀',
      is_featured: true,
      contribution_amount: 500,
      contribution_freq: 'mensual',
      notes: 'Meta principal de patrimonio neto',
    },
    {
      name: 'Fondo de Emergencia',
      goal_type: 'savings',
      target_amount: 15_000_000,
      target_currency: 'COP',
      current_amount: 8_500_000,
      color: '#F59E0B',
      icon: '🛡️',
      is_featured: false,
      contribution_amount: 500_000,
      contribution_freq: 'mensual',
      notes: '3 meses de gastos cubiertos',
    },
    {
      name: 'Apto Flandes — Pago deuda',
      goal_type: 'real_estate',
      target_amount: 280_000_000,
      target_currency: 'COP',
      current_amount: 41_000_000,
      color: '#6366F1',
      icon: '🏠',
      is_featured: false,
      liability_account_id: accountIds.flandes,
      property_address: 'Apto 301, Flandes, Tolima',
      property_value: 280_000_000,
      contribution_amount: 1_850_000,
      contribution_freq: 'mensual',
      notes: 'Deuda restante: $239M COP',
    },
  ]

  for (const goal of goals) {
    const { error } = await supabase.from('investment_goals').insert({ user_id: userId, ...goal })
    if (error) throw new Error(`Goal insert (${goal.name}) failed: ${error.message}`)
    console.log(`   ✅ Goal: ${goal.name}`)
  }
}

// ─── STEP 7: Seed budget + budget_items ─────────────────────────────────────

async function seedBudget(userId: string, categoryIds: Record<string, string>) {
  console.log('\n📊 STEP 7 — Seeding budget + budget_items...')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data: budget, error: budgetErr } = await supabase
    .from('budgets')
    .insert({
      user_id: userId,
      name: `Presupuesto ${month}/${year}`,
      month,
      year,
      currency: 'COP',
      is_active: true,
    })
    .select('id')
    .single()

  if (budgetErr) throw new Error(`Budget insert failed: ${budgetErr.message}`)
  console.log(`   ✅ Budget created: ${budget.id}`)

  const items = [
    { category_id: categoryIds.salario, planned_amount: 4_800_000, notes: 'Salario esperado' },
    { category_id: categoryIds.vivienda, planned_amount: 900_000, notes: 'Arriendo' },
    { category_id: categoryIds.alimentacion, planned_amount: 600_000, notes: 'Mercado + domicilios' },
    { category_id: categoryIds.transporte, planned_amount: 200_000, notes: 'SITP + Uber' },
    { category_id: categoryIds.entretenimiento, planned_amount: 150_000, notes: 'Streaming + ocio' },
    { category_id: categoryIds.salud, planned_amount: 100_000, notes: 'Médico + farmacia' },
    { category_id: categoryIds.cuota_hipoteca, planned_amount: 1_850_000, notes: 'Cuota Flandes' },
  ]

  const budgetItemRows = items.map((item) => ({
    budget_id: budget.id,
    ...item,
  }))

  const { error: itemsErr } = await supabase.from('budget_items').insert(budgetItemRows)
  if (itemsErr) throw new Error(`Budget items insert failed: ${itemsErr.message}`)
  console.log(`   ✅ ${items.length} budget items inserted`)
}

// ─── STEP 8: Seed operational costs ─────────────────────────────────────────

async function seedOperationalCosts(userId: string) {
  console.log('\n⚙️  STEP 8 — Seeding operational costs...')

  const costs = [
    {
      name: 'Netflix',
      cost_type: 'subscription',
      amount: 26_900,
      currency: 'COP',
      frequency: 'monthly',
      billing_day: 15,
      vendor: 'Netflix',
      category: 'Entretenimiento',
      is_active: true,
    },
    {
      name: 'Spotify Premium',
      cost_type: 'subscription',
      amount: 16_900,
      currency: 'COP',
      frequency: 'monthly',
      billing_day: 8,
      vendor: 'Spotify',
      category: 'Entretenimiento',
      is_active: true,
    },
    {
      name: 'GitHub Copilot',
      cost_type: 'subscription',
      amount: 10,
      currency: 'USD',
      frequency: 'monthly',
      billing_day: 22,
      vendor: 'GitHub',
      category: 'Herramientas',
      is_active: true,
    },
    {
      name: 'Dominio wealthost.co',
      cost_type: 'subscription',
      amount: 45_000,
      currency: 'COP',
      frequency: 'annual',
      vendor: 'GoDaddy',
      category: 'Infraestructura',
      is_active: true,
    },
    {
      name: 'Comisión Bancolombia',
      cost_type: 'commission',
      amount: 12_500,
      currency: 'COP',
      frequency: 'monthly',
      billing_day: 1,
      vendor: 'Bancolombia',
      category: 'Bancario',
      is_active: true,
    },
  ]

  for (const cost of costs) {
    const { error } = await supabase.from('operational_costs').insert({ user_id: userId, ...cost })
    if (error) throw new Error(`Operational cost insert (${cost.name}) failed: ${error.message}`)
    console.log(`   ✅ Cost: ${cost.name}`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 SantiWealth Demo Seeder')
  console.log('══════════════════════════')

  try {
    const userId = await upsertDemoUser()
    await purgeExistingData(userId)
    const accountIds = await seedAccounts(userId)
    const categoryIds = await seedCategories(userId)
    await seedTransactions(userId, accountIds, categoryIds)
    await seedGoals(userId, accountIds)
    await seedBudget(userId, categoryIds)
    await seedOperationalCosts(userId)

    console.log('\n✅ Demo seed complete!')
    console.log(`   Email:    ${DEMO_EMAIL}`)
    console.log(`   Password: ${DEMO_PASSWORD}`)
    console.log('══════════════════════════')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  }
}

main()
