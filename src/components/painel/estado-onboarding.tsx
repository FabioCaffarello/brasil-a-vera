// Estado "onboarding" do /painel — Wave 10 Etapa 3, refinado na Fase 3.
//
// Threshold: `onboarded_at IS NOT NULL` E `1 ≤ count(follows) ≤ 4` E
// nenhum `alert_delivery` recebida.
// Layout pós-Fase 3: H1 + KpiStrip com hint de "Quase lá" + sugestões UF.

import { BarChart3, Mail, MapPin, Users } from 'lucide-react'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  followsCount: number
  followedIds: Set<string>
  /** Total de reports inapp recebidos (geralmente 0 neste estado). */
  totalDeliveries: number
  /** Média de % alinhamento (geralmente null com 1-4 follows novos). */
  avgAlinhamento: { pct: number; sampleSize: number } | null
  profileCreatedAt: Date
}

function formatJoinDate(date: Date): string {
  const month = date.toLocaleDateString('pt-BR', {
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  })
  const year = date.getFullYear()
  return `${month.replace(/\.$/, '')}/${year}`
}

const FOLLOWS_RECOMENDADOS = 5

export async function EstadoOnboarding({
  uf,
  followsCount,
  followedIds,
  totalDeliveries,
  avgAlinhamento,
  profileCreatedAt,
}: Props) {
  const recomendacoes = uf
    ? await listRecomendacoesByUf({
        uf,
        excludeParlamentarIds: Array.from(followedIds),
        limit: 4,
      })
    : []

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div>
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Quase lá
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          Você acompanha{' '}
          <span className="font-medium text-foreground">{followsCount}</span>{' '}
          {followsCount === 1 ? 'parlamentar' : 'parlamentares'}. Recomendamos
          chegar a {FOLLOWS_RECOMENDADOS}+ para o primeiro report semanal ter
          conteúdo médio.
        </p>
      </div>

      <div className="mt-8">
        <KpiStrip
          items={[
            {
              icon: <Users className="size-5" />,
              label: 'Acompanhados',
              value: followsCount,
              hint: `meta ${FOLLOWS_RECOMENDADOS}+`,
              tone: 'warning',
            },
            {
              icon: <Mail className="size-5" />,
              label: 'Reports',
              value: totalDeliveries,
              hint: totalDeliveries === 0 ? 'primeiro em breve' : 'todos lidos',
              tone: 'muted',
            },
            {
              icon: <BarChart3 className="size-5" />,
              label: 'Alinhamento médio',
              value: avgAlinhamento
                ? `${Math.round(avgAlinhamento.pct)}%`
                : '—',
              hint: avgAlinhamento
                ? `${avgAlinhamento.sampleSize} com amostra`
                : 'amostra insuficiente',
              tone: 'muted',
            },
            {
              icon: <MapPin className="size-5" />,
              label: 'UF',
              value: uf ?? '—',
              hint: `desde ${formatJoinDate(profileCreatedAt)}`,
              tone: uf ? 'default' : 'muted',
            },
          ]}
        />
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
