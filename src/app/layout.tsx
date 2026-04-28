import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import CookieBanner from "@/components/CookieBanner";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "SantiWealth — Finanzas personales inteligentes",
  description: "Controla tu dinero, inversiones y metas con IA. Gratis para empezar. Hecho para Colombia.",
  metadataBase: new URL('https://wealthhost-nu.vercel.app'),
  alternates: { canonical: '/' },
  openGraph: {
    title: "SantiWealth — Finanzas personales inteligentes",
    description: "Controla tu dinero, inversiones y metas con IA. Gratis para empezar. Hecho para Colombia.",
    url: 'https://wealthhost-nu.vercel.app',
    siteName: 'SantiWealth',
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
      <body className={`${roboto.variable} antialiased`} style={{ fontFamily: 'var(--font-roboto), sans-serif' }}>
        <ThemeProvider>
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}