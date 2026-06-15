// Promovido ao RDS (ADR-033).
// (área logada /painel). Server Component.
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//
// `KpiStrip` (composição local) → `StatGroup layout="grid" cols={4}` + `Stat`
// do RDS /server — MESMO precedente da piloto-2/§3.6 (N4 KpiStrip→StatGroup,
// adotado direto, layout grid cols={4}). Tone map estabelecido:
//   default/muted → neutral · warning → warning · success → success ·
//   destructive → error.
// (O StatGroup grid reflowa 2-up no mobile → cols no md+, equivalente ao
// responsivo do KpiStrip; layout="strip" não reflowaria — por isso grid.)
//
// `ParlamentarCard` importado do ORIGINAL (client island de domínio —
// precedente listagens/perfis). regra 2 (data-viz) NÃO disparada: o único
// match do grep era a string "KpiStrip" (composição), não SVG/chart.

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
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          {displayName
            ? `Resumo de ${displayName.split(' ')[0]}`
            : 'Seu resumo'}
        </h1>
        <p className="mt-2 text-base text-fg-tertiary">
          O que acontece com quem você acompanha.
        </p>
      </div>

      <div className="mt-8">
        <StatGroup cols={4} layout="grid">
          <Stat
            icon={<Users className="size-5" />}
            label="Acompanhados"
            value={followsCount}
          />
          <Stat
            hint={
              unreadDeliveries > 0
                ? `${unreadDeliveries} não ${unreadDeliveries === 1 ? 'lido' : 'lidos'}`
                : 'todos lidos'
            }
            icon={<Mail className="size-5" />}
            label="Reports"
            tone={STAT_TONE[unreadDeliveries > 0 ? 'default' : 'muted']}
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
            tone={STAT_TONE[avgAlinhamento ? 'default' : 'muted']}
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
            Da sua UF ({uf}) — sugestões
          </h2>
          <p className="mt-1 text-fg-tertiary text-sm">
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
