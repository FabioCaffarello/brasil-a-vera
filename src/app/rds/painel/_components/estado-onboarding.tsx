// Cópia-rds de src/components/painel/estado-onboarding.tsx — migração painel
// (área logada /rds/painel). Server Component.
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//
// `KpiStrip` → `StatGroup layout="grid" cols={4}` + `Stat` do RDS /server
// (precedente piloto-2/§3.6); tone map default/muted→neutral, warning→warning.
// `ParlamentarCard` importado do ORIGINAL (client island de domínio).

import {
  Stat,
  StatGroup,
  type StatTone,
} from '@fabio.caffarello/react-design-system/server'
import { BarChart3, Mail, MapPin, Users } from 'lucide-react'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

type KpiTone = 'default' | 'success' | 'warning' | 'destructive' | 'muted'

const STAT_TONE: Record<KpiTone, StatTone> = {
  default: 'neutral',
  muted: 'neutral',
  success: 'success',
  warning: 'warning',
  destructive: 'error',
}

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
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Quase lá
        </h1>
        <p className="mt-3 text-base text-fg-tertiary">
          Você acompanha{' '}
          <span className="font-medium text-fg-primary">{followsCount}</span>{' '}
          {followsCount === 1 ? 'parlamentar' : 'parlamentares'}. Recomendamos
          chegar a {FOLLOWS_RECOMENDADOS}+ para o primeiro report semanal ter
          conteúdo médio.
        </p>
      </div>

      <div className="mt-8">
        <StatGroup cols={4} layout="grid">
          <Stat
            hint={`meta ${FOLLOWS_RECOMENDADOS}+`}
            icon={<Users className="size-5" />}
            label="Acompanhados"
            tone={STAT_TONE.warning}
            value={followsCount}
          />
          <Stat
            hint={totalDeliveries === 0 ? 'primeiro em breve' : 'todos lidos'}
            icon={<Mail className="size-5" />}
            label="Reports"
            tone={STAT_TONE.muted}
            value={totalDeliveries}
          />
          <Stat
            hint={
              avgAlinhamento
                ? `${avgAlinhamento.sampleSize} com amostra`
                : 'amostra insuficiente'
            }
            icon={<BarChart3 className="size-5" />}
            label="Alinhamento médio"
            tone={STAT_TONE.muted}
            value={avgAlinhamento ? `${Math.round(avgAlinhamento.pct)}%` : '—'}
          />
          <Stat
            hint={`desde ${formatJoinDate(profileCreatedAt)}`}
            icon={<MapPin className="size-5" />}
            label="UF"
            tone={STAT_TONE[uf ? 'default' : 'muted']}
            value={uf ?? '—'}
          />
        </StatGroup>
      </div>

      {recomendacoes.length > 0 && (
        <div className="mt-12">
          <h2 className="font-medium text-fg-primary text-lg">
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
