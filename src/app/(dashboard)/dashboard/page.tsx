import { redirect } from 'next/navigation'

/**
 * Legacy route — the dashboard was renamed to "Patrimonio" to better reflect
 * what it shows (composition of net worth, not a generic dashboard). This
 * redirect keeps old bookmarks, in-app links, and external referrers working.
 */
export default function DashboardRedirect() {
  redirect('/patrimonio')
}
