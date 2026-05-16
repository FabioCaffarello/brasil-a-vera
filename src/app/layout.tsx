import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'

import { Footer } from '@/components/site/footer'
import { Navbar } from '@/components/site/navbar'
import './globals.css'

// Inter — tipografia principal do Brasil a Vera a partir da Sprint 4.1.
// Substitui Geist Sans (que servia desde a Wave 1). Razão:
// - Inter é otimizada para corpo de texto longo (interfaces densas, dados)
// - Padrão de facto em design systems modernos (Vercel, Linear, Stripe)
// - next/font/google self-hosta com `display: swap` automático — sem
//   FOUT/FOIT extra; LCP impact mínimo (~30kb WOFF2 no critical path).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

// Geist Mono preservada como --font-mono para código/diagnósticos
// (ex.: WCAG audit display, tokens output em /dev/design).
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// URL canônica do site, usada como `metadataBase` para resolver URLs absolutas
// de OpenGraph/Twitter (`opengraph-image.tsx` por rota). Sem isso, Next.js usa
// `http://localhost:3000` como fallback — vaza em prod e quebra previews sociais.
//
// Prioridade (defense in depth, hygiene pre-3.1 — guarda contra regressão
// transitória observada em 2026-05-15):
//   1. SITE_URL explícita (preview deploys do Cloudflare Workers Builds)
//   2. http://localhost:3000 SÓ se NODE_ENV === 'development' (next dev)
//   3. Domínio canônico de produção como default — qualquer outro caso
//      (NODE_ENV undefined, 'production', 'test', valores inesperados)
//      cai aqui em vez de localhost. Inversão proposital vs. lógica
//      anterior (depender de NODE_ENV='production' explicitamente).
const SITE_URL =
  process.env.SITE_URL ??
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://brasilavera.org')

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Brasil a Vera — Transparência Legislativa',
  description: 'Plataforma open-source de transparência legislativa brasileira',
  openGraph: {
    title: 'Brasil a Vera',
    description: 'Você escolheu quem te representa. Agora veja o que ele faz.',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brasil a Vera',
    description: 'Você escolheu quem te representa. Agora veja o que ele faz.',
  },
}

// Sprint 4.1 PR 3 — shell global migra para tokens semânticos dark-first.
//
// Decisão D1 do plano da Sprint 4.1 (item a): dark hardcoded sem
// next-themes. <html className="dark"> força o tema dark em todas as
// rotas, independente de `prefers-color-scheme` do sistema do usuário.
// Light theme dormente (light tokens em :root do globals.css) — quando
// uma sprint futura introduzir toggle dark/light, basta remover o
// className="dark" daqui e adicionar `next-themes` Provider.
//
// Body migra de `bg-zinc-50 dark:bg-zinc-950` (zinc-based) para
// `bg-background text-foreground` (tokens semânticos do design system).
// As rotas existentes que ainda usam zinc continuam funcionando — Sprint
// 4.2 fará reskinning completo das listagens. Inconsistência visual
// transitória aceita (D4 do plano).
//
// ClerkProvider — registrado em ADR-022 §4 (Opção B + refinamento empírico
// do PR 2). Provider mora dentro do <AuthIslandLoader /> (lazy via
// next/dynamic), não em <html>. Anônimos baixam zero JS de Clerk.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning no <body> — extensões de browser
          (ColorZilla, Grammarly, LastPass, etc.) frequentemente injetam
          atributos (`cz-shortcut-listen`, `data-gramm`, etc.) no <body>
          ANTES do React hidratar, causando warning de mismatch que NÃO
          é bug nosso. Padrão React 19 recomendado para isolar a injeção
          ao nível em que ocorre (não cobre descendentes). */}
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:font-medium focus:text-foreground focus:text-sm focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          href="#conteudo"
        >
          Pular para o conteúdo
        </a>
        <Navbar />
        <main className="min-h-[calc(100vh-3rem)]" id="conteudo">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
