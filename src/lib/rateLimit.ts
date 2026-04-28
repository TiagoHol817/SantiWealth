/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding-window counter keyed by IP address.
 * NOTE: On Vercel each serverless invocation has its own memory,
 * so this is a per-instance limit — it prevents burst abuse
 * but is not globally distributed. Use Upstash Redis for global limits.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + options.windowMs
    store.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: options.limit - 1, resetAt }
  }

  entry.count++

  if (entry.count > options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

/** Extract a best-effort IP from Next.js request headers */
export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
