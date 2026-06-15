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
   * Wave 10 Hotfix 10.1 — gating server-side.
   *
   * Quando `follow` é undefined, o card renderiza sem o footer-action.
   * Preserva chamadas em /busca (sem contexto de follow) e cumpre a
   * decisão de produto: anônimo não vê o botão de acompanhar (nem
   * desabilitado, nem com cadeado — apenas não está lá). A página
   * resolve `isFollowing` via `getFollowsByUserId` no Server Component
   * e passa o objeto apenas para usuários autenticados.
   */
  follow?: {
    isFollowing: boolean
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
 * Card de listagem de parlamentar — Wave 10 Hotfix 10.1 (vertical com
 * footer-action). Substitui o layout horizontal pré-Hotfix.
 *
 * Estrutura:
 *  - <article> raiz (semântica de listagem)
 *  - <Link> cobre identidade + meta + alinhamento (área navegável)
 *  - Divider + footer-action (só quando `follow` é definido — anônimo
 *    nem o HTML do botão recebe; gating server-side)
 *
 * Contrato de fallback do alinhamento (preservado do PR4 Sprint 7.1):
 *  - com_amostra (votacoes ≥ 50 AND pct != null): barra + "X% alinhado · N votações"
 *  - amostra_insuficiente (0 < votacoes < 50): texto subtle, SEM barra
 *  - sem_dado (votacoes = 0): texto subtle, SEM barra
 *  - sem_dado em SENADO: + tooltip via title attr sobre cobertura parcial
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

  return (
    <article className="group flex h-full flex-col rounded-lg border border-line-default bg-surface-base transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-within:border-line-emphasis">
      <Link
        className="flex flex-1 flex-col gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        href={`/parlamentares/${id}`}
      >
        <div className="flex items-start gap-3">
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
              className="size-14 shrink-0 rounded-full bg-surface-raised"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-medium text-fg-primary leading-snug">
              {nome}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-tertiary text-sm">
              <span>{casa === 'CAMARA' ? 'Deputado' : 'Senador'}</span>
              <PartyBadge sigla={partidoSigla} size="sm" />
              <span aria-hidden>·</span>
              <span>{uf}</span>
            </div>
          </div>
        </div>
        <AlinhamentoStrip state={state} />
      </Link>
      {follow ? (
        <>
          <div
            aria-hidden="true"
            className="mx-4 border-line-default border-t"
          />
          <div className="flex justify-end px-2 py-1">
            <FollowButton
              initialIsFollowing={follow.isFollowing}
              parlamentarId={id}
              parlamentarNome={nome}
            />
          </div>
        </>
      ) : null}
    </article>
  )
}

function AlinhamentoStrip({ state }: { state: AlinhamentoState }) {
  if (state.kind === 'com_amostra') {
    return (
      <div>
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15"
        >
          <div
            className="h-full rounded-full bg-accent/60"
            style={{ width: `${state.percentual}%` }}
          />
        </div>
        <p className="mt-1 text-fg-tertiary text-xs">
          <span className="font-medium text-fg-primary">
            {state.percentual}% alinhado
          </span>{' '}
          · {state.votacoes} {state.votacoes === 1 ? 'votação' : 'votações'}
        </p>
      </div>
    )
  }

  if (state.kind === 'amostra_insuficiente') {
    return (
      <p className="text-fg-quaternary text-xs">
        Amostra insuficiente · {state.votacoes}{' '}
        {state.votacoes === 1 ? 'votação' : 'votações'} no período
      </p>
    )
  }

  // sem_dado
  return (
    <p
      className="text-fg-quaternary text-xs"
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
