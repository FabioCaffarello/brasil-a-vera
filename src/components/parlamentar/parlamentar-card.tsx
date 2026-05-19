import Link from 'next/link'

import { FollowButton } from '@/components/parlamentar/follow-button'
import { PartyBadge } from '@/design-system/compositions/party-badge'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'

interface Props {
  parlamentar: {
    id: string
    nome: string
    casa: string
    partidoSigla: string
    uf: string
    urlFoto: string | null
    /** Numeric do DB vem como string; conversão para Number no card. */
    pctAlinhamento?: string | null
    /** Integer do DB; 0 quando nunca votou ou agregado não rodou ainda. */
    votacoesAnalisadas?: number | null
  }
  /**
   * Wave 10 Etapa 2 — exibe FollowButton se passado.
   *
   * `isFollowing`: estado inicial da relação usuário↔parlamentar.
   * `isAnonymous`: se true, botão vira link para /sign-in.
   *
   * Quando `follow` é undefined (caso default), o card renderiza sem
   * botão — preserva o comportamento pré-Etapa 2 onde for chamado de
   * páginas que não consumiram `getFollowsByUserId` (ex.: /busca).
   */
  follow?: {
    isFollowing: boolean
    isAnonymous: boolean
  }
}

type AlinhamentoState =
  | { kind: 'com_amostra'; percentual: number; votacoes: number }
  | { kind: 'amostra_insuficiente'; votacoes: number }
  | { kind: 'sem_dado'; senadoLegacy: boolean }

/**
 * Classifica o estado de exibição do alinhamento (Wave 7 Sprint 7.1 PR4).
 *
 * Matriz canônica no handoff `docs/design/WAVE-7-PLAN-HANDOFF.md`
 * §Contrato de fallback. Threshold usa
 * `ALINHAMENTO_AMOSTRA_MINIMA` (= 50) para manter consistência com
 * `src/lib/queries/alinhamento.ts` que já flagra "amostra insuficiente"
 * com o mesmo valor.
 *
 * P2 — honestidade do dado: barra cheia em parlamentar sem dado
 * quebra a tese do produto inteiro.
 */
function classifyAlinhamento(
  votacoes: number | null | undefined,
  pct: string | null | undefined,
  casa: string,
): AlinhamentoState {
  const v = votacoes ?? 0
  if (v === 0) {
    return { kind: 'sem_dado', senadoLegacy: casa === 'SENADO' }
  }
  if (v < ALINHAMENTO_AMOSTRA_MINIMA || pct === null || pct === undefined) {
    return { kind: 'amostra_insuficiente', votacoes: v }
  }
  return { kind: 'com_amostra', percentual: Number(pct), votacoes: v }
}

/**
 * Card de listagem de parlamentar — Sprint 6.2 PR1 + Sprint 7.1 PR4
 * (Wave 7: ParlamentarCard v2 consumindo agregados).
 *
 * Wave 7 PR4 adiciona barra horizontal de alinhamento (CSS puro, 6px,
 * --accent/30%) e linha de texto compacto. Render segue contrato de
 * fallback do handoff:
 *
 * - com_amostra (votacoes ≥ 50 AND pct != null): barra + "X% alinhado · N votações"
 * - amostra_insuficiente (0 < votacoes < 50): texto subtle, SEM barra
 * - sem_dado (votacoes = 0): texto subtle, SEM barra
 * - sem_dado em SENADO: + tooltip via title attr sobre cobertura parcial
 *
 * Boundary OK: importa de `@/design-system/compositions/party-badge`
 * e de `@/modules/parlamentares/domain/alinhamento` (constante pública).
 */
export function ParlamentarCard({ parlamentar, follow }: Props) {
  const {
    id,
    nome,
    casa,
    partidoSigla,
    uf,
    urlFoto,
    pctAlinhamento,
    votacoesAnalisadas,
  } = parlamentar

  const state = classifyAlinhamento(votacoesAnalisadas, pctAlinhamento, casa)

  // Wave 10 Etapa 2 — wrapper passou de `<Link>` para `<div>` para
  // acomodar o FollowButton como sibling. `<Link>` interno cobre apenas
  // a área de navegação (foto + texto). Sem botão, o `<Link>` ocupa
  // toda a área e o card se comporta como antes da Etapa 2.
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-elevated focus-within:border-border-strong">
      <Link
        className="flex min-w-0 flex-1 items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        href={`/parlamentares/${id}`}
      >
        {urlFoto ? (
          // biome-ignore lint/performance/noImgElement: foto remota (camara.leg.br / senado.leg.br); dimensões explícitas evitam CLS.
          <img
            alt=""
            className="size-14 shrink-0 rounded-full object-cover"
            height={56}
            loading="lazy"
            src={urlFoto}
            width={56}
          />
        ) : (
          <div
            aria-hidden="true"
            className="size-14 shrink-0 rounded-full bg-surface-elevated"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{nome}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-foreground-muted text-sm">
            <span>{casa === 'CAMARA' ? 'Deputado' : 'Senador'}</span>
            <PartyBadge sigla={partidoSigla} size="sm" />
            <span aria-hidden>·</span>
            <span>{uf}</span>
          </div>
          <AlinhamentoStrip state={state} />
        </div>
      </Link>
      {follow ? (
        <FollowButton
          initialIsFollowing={follow.isFollowing}
          isAnonymous={follow.isAnonymous}
          parlamentarId={id}
        />
      ) : null}
    </div>
  )
}

function AlinhamentoStrip({ state }: { state: AlinhamentoState }) {
  if (state.kind === 'com_amostra') {
    return (
      <div className="mt-2">
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15"
        >
          <div
            className="h-full rounded-full bg-accent/60"
            style={{ width: `${state.percentual}%` }}
          />
        </div>
        <p className="mt-1 text-foreground-muted text-xs">
          <span className="font-medium text-foreground">
            {state.percentual}% alinhado
          </span>{' '}
          · {state.votacoes} {state.votacoes === 1 ? 'votação' : 'votações'}
        </p>
      </div>
    )
  }

  if (state.kind === 'amostra_insuficiente') {
    return (
      <p className="mt-2 text-foreground-subtle text-xs">
        Amostra insuficiente · {state.votacoes}{' '}
        {state.votacoes === 1 ? 'votação' : 'votações'} no período
      </p>
    )
  }

  // sem_dado
  return (
    <p
      className="mt-2 text-foreground-subtle text-xs"
      title={
        state.senadoLegacy
          ? 'Senado: cobertura parcial de orientação partidária'
          : undefined
      }
    >
      Sem votações nominais registradas
    </p>
  )
}
