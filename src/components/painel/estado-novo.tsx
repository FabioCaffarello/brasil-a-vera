// Promovido ao RDS (ADR-033).
// (área logada /painel). Server Component.
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//   text-foreground-subtle→ text-fg-quaternary
//   hover:text-foreground → hover:text-fg-primary
//
// `Button` → cópia local ./button (Button do RDS é client; cópia local
// token-clean — precedente ondas anteriores). `ParlamentarCard` importado do
// ORIGINAL (client island de domínio — precedente listagens/perfis; tokens BaV
// internos calibram na promoção). Hrefs reescritos pra /.

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { Button } from '@/design-system/primitives/button'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  isAnonymous: false
}

export async function EstadoNovo({ uf }: Props) {
  const recomendacoes = uf
    ? await listRecomendacoesByUf({ uf, excludeParlamentarIds: [], limit: 4 })
    : []

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Comece acompanhando alguém
        </h1>
        <p className="mt-3 text-base text-fg-tertiary">
          A área logada do Brasil à Vera responde "o que aconteceu com quem me
          importa". Adicione um parlamentar para começar a receber atualizações.
        </p>
        <Button asChild className="mt-6" size="lg">
          <Link href="/parlamentares">
            Explorar parlamentares
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      {recomendacoes.length > 0 && (
        <div className="mt-12">
          <h2 className="font-medium text-fg-primary text-lg">
            Da sua UF ({uf}) — sugestões
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recomendacoes.map((p) => (
              <li key={p.id}>
                <ParlamentarCard
                  follow={{ isFollowing: false }}
                  parlamentar={p}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!uf && (
        <p className="mt-12 text-center text-fg-quaternary text-sm">
          Você pulou o passo de UF no onboarding. Para receber recomendações
          locais, preencha sua UF em{' '}
          <Link
            className="underline underline-offset-4 hover:text-fg-primary"
            href="/painel?tab=configuracoes"
          >
            Configurações
          </Link>
          .
        </p>
      )}
    </section>
  )
}
