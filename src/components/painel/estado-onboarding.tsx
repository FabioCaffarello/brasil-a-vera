// Estado "onboarding" do /painel — Wave 10 Etapa 3.
//
// Threshold: `onboarded_at IS NOT NULL` E `1 ≤ count(follows) ≤ 4` E
// nenhum `alert_delivery` recebida.
// Layout: KPI Acompanhados + bloco "Quase lá — recomendamos 5+
// parlamentares" + cards de sugestão da UF (excluindo os já acompanhados).
//
// Outros KPIs (Movimentações / Reports / Período especial) ficam de fora
// nesta etapa — dependem de Etapas 7/8 que ainda não rodaram.

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  followsCount: number
  followedIds: Set<string>
}

export async function EstadoOnboarding({
  uf,
  followsCount,
  followedIds,
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
          Quase lá
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          Você acompanha{' '}
          <span className="font-medium text-foreground">{followsCount}</span>{' '}
          {followsCount === 1 ? 'parlamentar' : 'parlamentares'}. Recomendamos
          chegar a 5+ para o primeiro report semanal ter conteúdo médio.
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
            Outros indicadores (movimentações, reports recebidos, período
            especial) aparecem aqui quando os alertas começarem a chegar — Wave
            10 Etapas 7 e 8.
          </p>
        </div>
      </div>

      {recomendacoes.length > 0 && (
        <div className="mt-12">
          <h2 className="font-medium text-foreground text-lg">
            {uf ? `Da sua UF (${uf}) — sugestões` : 'Sugestões'}
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
    </section>
  )
}
