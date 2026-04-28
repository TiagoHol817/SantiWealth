export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url     = new URL(request.url)
  const code    = url.searchParams.get('code')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  // Minimal diagnostic: confirm the route is reachable before adding Supabase logic
  return Response.redirect(`${siteUrl}/dashboard?debug=callback_reached&has_code=${!!code}`)
}
