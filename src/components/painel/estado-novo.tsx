// Estado "novo" do /painel — Wave 10 Etapa 3.
//
// Threshold: `onboarded_at IS NOT NULL` E `count(follows) = 0`.
// Layout: Hero "Comece acompanhando alguém" + sugestões da UF (se UF
// preenchida; senão pede UF inline antes — não implementado nesta etapa,
// já que o wizard cobre a captura de UF e usuários sem UF + sem follows
// chegam aqui só por skip total do wizard).

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
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Comece acompanhando alguém
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
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
          <h2 className="font-medium text-foreground text-lg">
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
        <p className="mt-12 text-center text-foreground-subtle text-sm">
          Você pulou o passo de UF no onboarding. Para receber recomendações
          locais, preencha sua UF em{' '}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
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
