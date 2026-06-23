import { AlinhamentoStrip } from '@/components/parlamentar/alinhamento-strip'
import { FollowButton } from '@/components/parlamentar/follow-button'
import { ParlamentarPreviewLink } from '@/components/parlamentar/preview-drawer'
import { PartyBadge } from '@/design-system/compositions/party-badge'
import { classifyAlinhamentoCard } from '@/modules/parlamentares/domain/alinhamento-card'

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
    /** Agregados extras — usados só pelo drawer de preview (não pelo card). */
    proposicoesCount?: number | null
    gastoTotalAno?: string | null
    percentilGastoCasa?: string | null
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

  const state = classifyAlinhamentoCard(
    votacoesAnalisadas,
    pctAlinhamento,
    casa,
  )

  return (
    <article className="group flex h-full flex-col rounded-lg border border-line-default bg-surface-base transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-within:border-line-emphasis">
      <ParlamentarPreviewLink
        className="flex flex-1 flex-col gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        data={{
          id,
          nome,
          casa,
          partidoSigla,
          uf,
          urlFoto,
          pctAlinhamento,
          votacoesAnalisadas,
          proposicoesCount: parlamentar.proposicoesCount,
          gastoTotalAno: parlamentar.gastoTotalAno,
          percentilGastoCasa: parlamentar.percentilGastoCasa,
          follow,
        }}
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
      </ParlamentarPreviewLink>
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
