# Impeccable — Code quality standard for WealtHost

> Read BEFORE any code change. These rules are non-negotiable.
> Violations cause real bugs that took blood to find.

## 1. Hard rules — never violate

### 1.1 Middleware lives in proxy.ts only
`src/proxy.ts` is the sole middleware file. **Never** create `src/middleware.ts`. Both files together produce: "Both middleware file and proxy file detected". All routing, auth, headers, and bypass logic lives in `proxy.ts`.

### 1.2 No hardcoded user data
All logic generic. User values come from DB queries scoped via `getUser()`. The only constants allowed in code: product-wide enums, thresholds, labels (Wealth Score dimensions, asset_type values).

- Bad: `if (account.name === 'Bancolombia Ahorros')`
- Good: `if (account.type === 'bank')`

### 1.3 Soft-delete consistency (DB-enforced)
Soft-deleting sets BOTH `is_active = false` AND `deleted_at = NOW()`. Restoring resets BOTH (`is_active = true`, `deleted_at = null`, `deleted_by = null`).

CHECK constraints on `investment_assets` and `investment_transactions` make the inconsistent state physically impossible. Upserts that set `is_active: true` MUST also include `deleted_at: null` and `deleted_by: null` in the same payload — otherwise the constraint rejects the write.

### 1.4 .maybeSingle() for queries that may return 0
Use `.maybeSingle()`, not `.single()`. PostgREST returns 406 on `.single()` with 0 matches — runtime crash for paths like "fetch this month's budget".

### 1.5 RLS + explicit user_id filter
Every query against user-owned tables filters by `user_id` explicitly. RLS is defense-in-depth, not the API. Never trust RLS alone.

### 1.6 No REVOKE ALL FROM anon
Blocks legitimate app access. Use RLS policies for permission, not table-level GRANT/REVOKE.

### 1.7 Next.js 16 + Turbopack
`next.config.ts` must NOT contain a `webpack()` block. Turbopack is incompatible. If bundling config needed, use Turbopack-compatible options or ask first.

## 2. Change discipline

### 2.1 Minimal surface area
Modify ONLY what the task requires. Don't refactor adjacent code "while you're there". Don't reorder imports. Don't reformat. If you spot drift, mention it in the final report — don't fix inline.

### 2.2 Verify after every phase
After any non-trivial change: `tsc --noEmit`. If it fails, STOP and report. Don't continue to next phase with broken types.

### 2.3 Never auto-commit
You apply changes. User validates visually and commits manually. Never run `git commit` or `git push` unless the prompt explicitly requests it.

### 2.4 Whole files when generating output
When user will paste code, deliver complete files. Not diffs. Not partial snippets.

### 2.5 If a skill file is missing
Report it in the final output. Proceed with standard principles. Do not silently skip.

## 3. Database access patterns

### 3.1 Soft-delete filters in every read
Every query against `accounts`, `transactions`, `investment_assets`, `investment_transactions`, `cdts`, `savings_plans`, `goals`, `recurring_expenses` filters BOTH:
- `.eq('is_active', true)`
- `.is('deleted_at', null)`

Both required. `is_active=false` alone matches pre-migration-016 legacy rows.

### 3.2 Embedded selects with soft-delete-aware tables
Use `!inner` to force inner join, then dotted-path filters:

```ts
.from('portfolio_positions')
.select('total_shares, investment_assets!inner(ticker, is_active, deleted_at)')
.eq('investment_assets.is_active', true)
.is('investment_assets.deleted_at', null)
```

### 3.3 Ownership checks before mutation
Before UPDATE or DELETE on user-owned rows:

```ts
const { data } = await supabase
  .from('table')
  .select('id')
  .eq('id', recordId)
  .eq('user_id', user.id)
  .maybeSingle()
if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
```

### 3.4 Currency normalization
All cross-currency math goes through `normalizeToCOP(amount, currency, trm)` from `@/lib/services/currency`. Never multiply by TRM inline. Helper handles `currency=null` defaulting to COP.

## 4. Error handling

### 4.1 Generic user-facing messages
Errors returned to client never expose: database providers, table names, column names, infrastructure (Supabase, Prisma, Yahoo Finance), or stack traces.

- Bad: `{ error: "PostgrestError 23503 violates FK constraint" }`
- Good: `{ error: "No se pudo guardar el activo" }`

Server logs can be detailed — `console.error('[save-investment]', error.code)` is fine. Just keep it out of the response body.

### 4.2 Sanitize all user input
Use `sanitizeText`, `sanitizeAmount`, `sanitizeDate`, `isValidUUID` from `@/lib/sanitize` before persisting. Don't trust shape, length, or content of any `req.json()` field.

### 4.3 Rate limit external endpoints
Endpoints proxying Yahoo Finance, TRM API, OCR: use `rateLimit(getIP(req), { limit, windowMs })`. Match limit to cost: 30/min for cheap reads, 10/min for bulk operations.

## 5. API contract

### 5.1 Response shape
- Success: `{ success: true, ...optional fields }`
- Failure: `{ error: 'Mensaje en español' }` with HTTP status 400/401/404/429/500.

### 5.2 yfinance_key normalization for crypto
Crypto tickers need `-USD` suffix for Yahoo Finance. When upserting a crypto asset:

```ts
const yfinanceKey = assetType === 'crypto' && !/-USD$/i.test(ticker)
  ? `${ticker.replace(/USD$/i, '')}-USD`
  : ticker
```

This converts `BTC → BTC-USD`, `ETHUSD → ETH-USD`, leaves valid keys untouched.

## 6. UI conventions

### 6.1 Fixed dark color palette
- Cards: `#1a1f2e`
- Background: `#0f1117`
- Green (positive): `#00d4aa`
- Purple (primary): `#6366f1`
- Red (negative): `#ef4444`
- Yellow (warning): `#f59e0b`
- Text default: `#e5e7eb`
- Text secondary: `#6b7280`
- Text dim: `#4b5563`

Never invent colors. If a state needs a new one, ask first.

### 6.2 Money display
Use `formatCOP()`, `formatUSD()`, `formatByCurrency()` from `@/lib/services/currency`. Never `toLocaleString()` inline.

### 6.3 No abbreviations
"Criptomonedas", not "Cripto". "Inversiones", not "Inv.". App speaks Colombian Spanish in full words.

### 6.4 Animations
animejs v4 only. NEVER framer-motion. If unsure, ask.

## 7. Pre-flight checklist

Before reporting "done":

- [ ] `tsc --noEmit` clean
- [ ] Only files listed in the prompt were modified
- [ ] No `console.log` left (use `console.error` for genuine errors only)
- [ ] No `src/middleware.ts` created
- [ ] Soft-delete filters on any new read query
- [ ] Generic error messages on any new API response
- [ ] All values from queries or props — zero hardcoded user data
- [ ] No `git commit` or `git push` executed
