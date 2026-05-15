import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Navbar } from '@/components/site/navbar'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

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
    : 'https://brasil-a-vera.fabio-caffarello.workers.dev')

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

// ClerkProvider escopo — decisão registrada em ADR-022 §4 (Opção B).
//
// Após medição empírica no PR 1 da Sprint 4.1 mostrou que envolver <html>
// com <ClerkProvider> adicionava ~50.8kb gzipped em TODAS as rotas
// públicas (gate de 50kb tripado em 815 bytes — 1.6% além).
//
// Decisão do owner: Opção B — Provider NÃO entra em <html>. Em vez
// disso, o <AuthIsland> (Sprint 4.1 PR 2, client component lazy via
// next/dynamic) embrulha localmente um <ClerkProvider> em volta dos
// componentes que precisam (<UserButton>, hooks Clerk client).
//
// Implicações:
// - Rotas anônimas (~80% do tráfego) NÃO pagam o bundle do Clerk SDK
//   no client — Provider só hidrata quando AuthIsland mounta
// - auth() server-side em RSCs continua funcionando (lê de cookies via
//   middleware; não exige Provider client)
// - clerkMiddleware (src/middleware.ts) é INDEPENDENTE do Provider;
//   roda server-side em /minha-area/(.*) only
// - Sprint 4.5 quando criar /minha-area/* — pode adicionar Provider
//   no layout daquele route group para client hooks dentro de rotas
//   privadas (custo limitado a usuários autenticados)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:border-zinc-300 focus:bg-white focus:px-3 focus:py-2 focus:font-medium focus:text-sm focus:text-zinc-900 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:border-zinc-600 dark:focus:bg-zinc-900 dark:focus:text-zinc-100"
        >
          Pular para o conteúdo
        </a>
        <Navbar />
        <main id="conteudo" className="min-h-[calc(100vh-3rem)]">
          {children}
        </main>
        <footer className="border-t border-zinc-200 bg-white py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
            <span>
              Dados oficiais da Câmara dos Deputados e do Senado Federal.
            </span>
            <a
              href="https://github.com/FabioCaffarello/brasil-a-vera"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Código no GitHub ↗
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
