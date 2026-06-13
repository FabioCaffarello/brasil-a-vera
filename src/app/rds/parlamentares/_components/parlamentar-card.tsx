// Cópia-rds de src/components/parlamentar/parlamentar-card.tsx — onda
// HeroSection (listagem /parlamentares). Original INTOCADO.
//
// Imports dos ORIGINAIS (precedente client islands / composições mantidas):
// - FollowButton: client island (gating server-side preservado; quando
//   `follow` é undefined, zero HTML/JS do botão — anônimo não vê).
// - PartyBadge: composição mantida local (sem par RDS — precedente perfis).
//
// href do card → /rds/parlamentares/[id] (o perfil migrado existe sob
// /rds/; navegação CONTIDA na staging). Footer-action (FollowButton)
// aponta para o parlamentarId real (lógica de follow é produção).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border        → border-line-default
//   bg-surface           → bg-surface-base
//   hover:border-border-strong / focus-within:border-border-strong → line-emphasis
//   hover:bg-surface-elevated → hover:bg-surface-raised
//   ring-ring            → ring-line-focus
//   ring-offset-surface  → ring-offset-surface-base
//   bg-surface-elevated  → bg-surface-raised
//   text-foreground      → text-fg-primary
//   text-foreground-muted→ text-fg-tertiary
//   text-foreground-subtle → text-fg-quaternary
//
// Tokens MANTIDOS (resíduo data-viz, ADR-024, sem par RDS — mesma régua
// do `accent` da piloto-2 alinhamento.tsx): bg-accent/15, bg-accent/60
// (barra CSS-only do AlinhamentoStrip).

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
   * Gating server-side (Wave 10 Hotfix 10.1, preservado): quando `follow`
   * é undefined, o card renderiza sem o footer-action — anônimo não vê o
   * botão (nem HTML, nem JS de toggle).
   */
  follow?: {
    isFollowing: boolean
  }
}

type AlinhamentoState =
  | { kind: 'com_amostra'; percentual: number; votacoes: number }
  | { kind: 'amostra_insuficiente'; votacoes: number }
  | { kind: 'sem_dado'; senadoLegacy: boolean }

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
        href={`/rds/parlamentares/${id}`}
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
