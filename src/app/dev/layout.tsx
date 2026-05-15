import type { Metadata } from 'next'

/**
 * Layout das rotas internas /dev/* — Sprint 4.0 PR 7.
 *
 * Aplica:
 * 1. `.dark` class na div raiz: força o tema dark via CSS variables
 *    definidas em globals.css (`.dark { --background: ... }`).
 *    Necessário porque o ROOT layout em src/app/layout.tsx ainda usa
 *    `prefers-color-scheme: dark` (preservado para diff zero das
 *    rotas públicas existentes). PR shell 4.1 unifica tudo em dark.
 * 2. `bg-background text-foreground`: preenche o viewport do route group
 *    com os tokens dark; sem isso o body legacy (`bg-zinc-50`) aparecia
 *    atrás do conteúdo dark.
 * 3. `min-h-screen`: rota interna precisa cobrir tela inteira pra QA.
 * 4. `metadata.robots: noindex`: cobre crawlers que respeitam meta tags.
 *    `next.config.ts` adiciona o header `X-Robots-Tag: noindex, nofollow`
 *    como defense in depth (para crawlers que só leem headers HTTP).
 *    Probe smoke `dev-routes-noindex` valida ambos.
 */

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
