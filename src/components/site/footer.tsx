/**
 * Footer — Sprint 4.1 PR 3.
 *
 * RSC default. Substitui o footer inline do layout.tsx. Consome tokens
 * semânticos do design system (Sprint 4.0 PR 2):
 *
 *   - bg-surface              (era bg-white)
 *   - border-border           (era border-zinc-200)
 *   - text-foreground-muted   (era text-zinc-500)
 *   - text-foreground (hover) (era text-zinc-900)
 *
 * Estrutura semântica preservada: <footer> com crédito + link GitHub.
 * Hierarquia mantida (Wave 4.3 reskinning amplo pode iterar layout).
 */
export function Footer() {
  return (
    <footer className="border-border border-t bg-surface py-4 text-foreground-muted text-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
        <span>Dados oficiais da Câmara dos Deputados e do Senado Federal.</span>
        <a
          className="transition-colors hover:text-foreground"
          href="https://github.com/FabioCaffarello/brasil-a-vera"
          rel="noopener noreferrer"
          target="_blank"
        >
          Código no GitHub ↗
        </a>
      </div>
    </footer>
  )
}
