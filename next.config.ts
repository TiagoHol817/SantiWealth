import type { NextConfig } from 'next'

const nextConfig: NextConfig = {

  // pdfjs-dist v4 is pure ESM — it cannot be externalized (serverExternalPackages)
  // because Node's require() cannot load ESM modules. Removing it lets Next.js/webpack
  // bundle it, which handles ESM imports correctly on the server side.

  // Silencia el warning de Turbopack
  turbopack: {},

  // Legacy CDT routes — module was split out of /inversiones into /cdts.
  // We can't rewrite by query string (Next.js redirects only key on path),
  // so this only covers anyone who saved /inversiones/cdts/* as a bookmark.
  async redirects() {
    return [
      { source: '/inversiones/cdts',           destination: '/cdts', permanent: true },
      { source: '/inversiones/cdts/:path*',    destination: '/cdts', permanent: true },
    ]
  },

  // Deshabilita el header X-Powered-By
  poweredByHeader: false,

  // ── HTTP Security Headers ───────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // blob: lets Tesseract.js spawn its OCR worker (the worker
              // script is fetched, blob-wrapped, then instantiated).
              // cdn.jsdelivr.net is the primary Tesseract.js CDN (v5);
              // unpkg.com stays allowlisted as a fallback.
              // tessdata.projectnaptha.com hosts the spa/eng language data.
              // 'unsafe-eval' is required so the WASM module can compile.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com https://tessdata.projectnaptha.com",
              // script-src-elem is what modern Chromium consults for <script src>
              // loads. Mirroring the CDN allowlist here means we don't depend on
              // the script-src fallback. 'unsafe-eval' is deliberately omitted
              // because it only applies to script-src, not script-src-elem.
              "script-src-elem 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com https://tessdata.projectnaptha.com",
              // Explicit worker-src so the browser doesn't have to fall back
              // to script-src (cleaner, modern CSP). Tesseract uses blob: URLs.
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // tessdata.projectnaptha.com → Spanish/English language data.
              // cdn.jsdelivr.net           → primary Tesseract.js v5 CDN.
              // unpkg.com                  → Tesseract fallback CDN.
              // data: + blob: are required because Tesseract.js v5 fetches its
              // WASM binary as a data: URL after loading the core script, and
              // OCR worker may also XHR a blob: URL of its own internals.
              "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://query1.finance.yahoo.com https://datos.gov.co https://tessdata.projectnaptha.com https://cdn.jsdelivr.net https://unpkg.com",
              // blob: is required so URL.createObjectURL() previews of
              // user-selected files (e.g. screenshot import modal) can render.
              "img-src 'self' data: blob: https://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },

  // ── Imágenes: solo dominios permitidos ──────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    dangerouslyAllowSVG: false,
  },
}

export default nextConfig