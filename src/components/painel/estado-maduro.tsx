// Estado "maduro" do /painel — Wave 10 Etapa 3, refinado visualmente
// na Fase 3 do refator (RFC §5: KPIs no padrão visual aprovado).
//
// Threshold: `count(follows) ≥ 5` OU `count(alert_delivery delivered) ≥ 1`.
// Layout pós-Fase 3: H1 + KpiStrip (4 cells) + "Da sua UF — sugestões".

import { BarChart3, Mail, MapPin, Users } from 'lucide-react'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  followsCount: number
  followedIds: Set<string>
  displayName: string | null
  /** Total de reports inapp recebidos pelo usuário (Fase 3 KPI). */
  totalDeliveries: number
  /** Não lidos — hint do KPI Reports (Fase 3). */
  unreadDeliveries: number
  /** Média de % alinhamento dos acompanhados com amostra ≥50 votações. */
  avgAlinhamento: { pct: number; sampleSize: number } | null
  /** Data de criação do user_profile — hint do KPI UF. */
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

export async function EstadoMaduro({
  uf,
  followsCount,
  followedIds,
  displayName,
  totalDeliveries,
  unreadDeliveries,
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
          {displayName
            ? `Resumo de ${displayName.split(' ')[0]}`
            : 'Seu resumo'}
        </h1>
        <p className="mt-2 text-base text-foreground-muted">
          O que acontece com quem você acompanha.
        </p>
      </div>

      <div className="mt-8">
        <KpiStrip
          items={[
            {
              icon: <Users className="size-5" />,
              label: 'Acompanhados',
              value: followsCount,
            },
            {
              icon: <Mail className="size-5" />,
              label: 'Reports',
              value: totalDeliveries,
              hint:
                unreadDeliveries > 0
                  ? `${unreadDeliveries} não ${unreadDeliveries === 1 ? 'lido' : 'lidos'}`
                  : 'todos lidos',
              tone: unreadDeliveries > 0 ? 'default' : 'muted',
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
              tone: avgAlinhamento ? 'default' : 'muted',
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
            Da sua UF ({uf}) — sugestões
          </h2>
          <p className="mt-1 text-foreground-muted text-sm">
            Parlamentares ativos da sua UF que você ainda não acompanha.
          </p>
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
