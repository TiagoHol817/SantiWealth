import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import CookieBanner from "@/components/CookieBanner";

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "WealtHost — Finanzas personales inteligentes",
  description: "Controla tu dinero, inversiones y metas con IA. Gratis para empezar. Hecho para Colombia.",
  metadataBase: new URL('https://wealthost-nu.vercel.app'),
  alternates: { canonical: '/' },
  openGraph: {
    title: "WealtHost — Finanzas personales inteligentes",
    description: "Controla tu dinero, inversiones y metas con IA. Gratis para empezar. Hecho para Colombia.",
    url: 'https://wealthost-nu.vercel.app',
    siteName: 'WealtHost',
    locale: 'es_CO',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`}>
        {/* Fixed ambient gradient blobs — GPU-composited, pointer-events-none */}
        <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="blob-1" />
          <div className="blob-2" />
          <div className="blob-3" />
        </div>
        <ThemeProvider>
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
