import { Eye } from 'lucide-react'
import Link from 'next/link'

/**
 * Footer — pós-spike navbar (Wave 6).
 *
 * Refinement vs Sprint 6.1 PR 2:
 * - Brand mark à esquerda (Eye gradient + wordmark) ecoa a navbar e
 *   fecha o shell visualmente top↔bottom (coesão de marca).
 * - Layout segue flex-wrap; em viewports estreitos o mark passa para
 *   cima e os links empilham logo abaixo.
 * - Tipografia text-sm preservada; foreground-muted no copy, hover
 *   text-foreground nos links.
 *
 * Mantém:
 * - bg-surface + border-border (tokens semânticos Wave 4)
 * - Crédito a fontes oficiais (Câmara + Senado)
 * - Link GitHub com rel/target corretos
 * - Estrutura semântica <footer>
 */
const FOOTER_LINK_CLASS =
  'rounded transition-colors hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function Footer() {
  return (
    <footer className="border-border border-t bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-fg-tertiary text-sm">
        <div className="flex items-center gap-6">
          <Link
            className="group flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="/"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary ring-1 ring-white/10"
            >
              <Eye className="h-3 w-3 text-white" />
            </span>
            <span className="font-medium text-fg-primary">Brasil à Vera</span>
          </Link>
          <p className="hidden md:block">
            Dados oficiais da Câmara dos Deputados e do Senado Federal.
          </p>
        </div>
        {/* Auditoria UX 2026-07-20 (P1.7): footer é o home das rotas
            secundárias (Vetos/Frentes/Comparar/Feed) que não cabem no menu
            desktop. gap-x/gap-y separados alinham o wrap no mobile. */}
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <Link className={FOOTER_LINK_CLASS} href="/vetos">
            Vetos
          </Link>
          <Link className={FOOTER_LINK_CLASS} href="/frentes">
            Frentes
          </Link>
          <Link className={FOOTER_LINK_CLASS} href="/comparar">
            Comparar
          </Link>
          <Link className={FOOTER_LINK_CLASS} href="/feed">
            Feeds RSS
          </Link>
          <Link className={FOOTER_LINK_CLASS} href="/docs">
            Como ler os dados
          </Link>
          <Link className={FOOTER_LINK_CLASS} href="/docs/metodologia">
            Metodologia
          </Link>
          <a
            className={FOOTER_LINK_CLASS}
            href="https://github.com/FabioCaffarello/brasil-a-vera"
            rel="noopener noreferrer"
            target="_blank"
          >
            Código no GitHub ↗
          </a>
        </nav>
        <p className="basis-full text-fg-quaternary md:hidden">
          Dados oficiais da Câmara dos Deputados e do Senado Federal.
        </p>
      </div>
    </footer>
  )
}
