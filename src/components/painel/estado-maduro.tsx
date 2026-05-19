// Estado "maduro" do /painel — Wave 10 Etapa 3.
//
// Threshold: `count(follows) ≥ 5` OU `count(alert_delivery delivered) ≥ 1`.
// Layout nesta etapa: KPI Acompanhados + bloco "Da sua UF — sugestões"
// (excluindo já acompanhados, cap 4).
//
// Outros KPIs (Movimentações, Reports recebidos, Período especial) e o
// card "Último report" dependem de Etapas 7/8 e ficam para essas etapas.

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  followsCount: number
  followedIds: Set<string>
  displayName: string | null
}

export async function EstadoMaduro({
  uf,
  followsCount,
  followedIds,
  displayName,
}: Props) {
  const recomendacoes = uf
    ? await listRecomendacoesByUf({
        uf,
        excludeParlamentarIds: Array.from(followedIds),
        limit: 4,
      })
    : []

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div>
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          {displayName ? `Resumo de ${displayName}` : 'Seu resumo'}
        </h1>
        <p className="mt-2 text-base text-foreground-muted">
          O que acontece com quem você acompanha.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
        <div>
          <p className="text-foreground-muted text-xs uppercase tracking-wide">
            Acompanhados
          </p>
          <p className="mt-1 font-semibold text-3xl text-foreground">
            {followsCount}
          </p>
        </div>
        <div className="text-foreground-subtle text-sm">
          <p>
            Indicadores de movimentações e reports semanais entram aqui assim
            que os alertas (Wave 10 Etapa 7) começarem a rodar.
          </p>
        </div>
      </div>

      {recomendacoes.length > 0 && (
        <div className="mt-12">
          <h2 className="font-medium text-foreground text-lg">
            Da sua UF ({uf}) — sugestões
          </h2>
          <p className="mt-1 text-foreground-muted text-sm">
            Parlamentares ativos da sua UF que você ainda não acompanha.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recomendacoes.map((p) => (
              <li key={p.id}>
                <ParlamentarCard
                  follow={{ isFollowing: false, isAnonymous: false }}
                  parlamentar={p}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
