import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'
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
// Override via `SITE_URL` cobre preview deploys do Cloudflare Workers Builds.
const SITE_URL =
  process.env.SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://brasil-a-vera.fabio-caffarello.workers.dev'
    : 'http://localhost:3000')

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
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-zinc-300 focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:border-zinc-600 dark:focus:bg-zinc-900 dark:focus:text-zinc-100"
        >
          Pular para o conteúdo
        </a>
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3"
          >
            <Link
              href="/"
              className="font-semibold tracking-tight hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Brasil a Vera
            </Link>
            <div className="flex items-center gap-4">
              <ul className="hidden items-center gap-4 text-sm sm:flex">
                <li>
                  <Link
                    href="/parlamentares"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Parlamentares
                  </Link>
                </li>
                <li>
                  <Link
                    href="/proposicoes"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Proposições
                  </Link>
                </li>
                <li>
                  <Link
                    href="/votacoes"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Votações
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Docs
                  </Link>
                </li>
              </ul>
              <SearchForm variant="header" />
            </div>
          </nav>
        </header>
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
