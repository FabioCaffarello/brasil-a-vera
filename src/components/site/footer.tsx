import Link from 'next/link'

/**
 * Footer — Sprint 6.1 PR 2 (Wave 6, reskin shell).
 *
 * Refinement visual vs Sprint 4.1 PR 3:
 * - Breathing room: py-4 → py-6
 * - Tipografia: text-xs → text-sm (mais legível em qualquer viewport)
 * - Links secundários agrupados em <nav aria-label="Footer"> (a11y)
 * - Novo link "Como ler os dados" → /docs (porta de entrada para
 *   metodologia; será atualizado para /metodologia na Sprint 6.5
 *   quando o hub TOC entrar)
 *
 * Mantém:
 * - bg-surface + border-border (tokens semânticos Wave 4)
 * - Crédito a fontes oficiais (Câmara + Senado)
 * - Link GitHub com rel/target corretos
 * - Estrutura semântica <footer> (intocada)
 */
export function Footer() {
  return (
    <footer className="border-border border-t bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-foreground-muted text-sm">
        <p>Dados oficiais da Câmara dos Deputados e do Senado Federal.</p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link
            className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="/docs"
          >
            Como ler os dados
          </Link>
          <a
            className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="https://github.com/FabioCaffarello/brasil-a-vera"
            rel="noopener noreferrer"
            target="_blank"
          >
            Código no GitHub ↗
          </a>
        </nav>
      </div>
    </footer>
  )
}
