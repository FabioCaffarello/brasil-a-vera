'use client'

import { Button } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import { AlinhamentoStrip } from '@/components/parlamentar/alinhamento-strip'
import { FollowButton } from '@/components/parlamentar/follow-button'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { createPreview } from '@/components/preview/create-preview'
import { PartyBadge } from '@/design-system/compositions/party-badge'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/design-system/primitives/rds-drawer'
import { formatBRL } from '@/lib/format'
import { classifyAlinhamentoCard } from '@/modules/parlamentares/domain/alinhamento-card'

// Dados do preview = exatamente o que o ParlamentarCard já recebe como props
// (mais o gating de follow). Zero fetch novo: o drawer é apresentação
// enriquecida desses dados + CTAs que são links.
export interface ParlamentarPreviewData {
  id: string
  nome: string
  casa: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
  pctAlinhamento?: string | null
  votacoesAnalisadas?: number | null
  /** Agregados da mesma linha de estatística (drawer de preview). */
  proposicoesCount?: number | null
  gastoTotalAno?: string | null
  percentilGastoCasa?: string | null
  /** Gating server-side (Wave 10 Hotfix 10.1): presente só p/ autenticado. */
  follow?: { isFollowing: boolean }
}

const { Provider, usePreview, PreviewLink } =
  createPreview<ParlamentarPreviewData>()

/** Envolve a grid da listagem; mantém o estado do drawer único da página. */
export const ParlamentarPreviewProvider = Provider

/**
 * Link do card que abre o drawer de preview no clique (progressive
 * enhancement). Sem JS / fora da listagem é um <a href> normal para o perfil.
 */
export const ParlamentarPreviewLink = PreviewLink

const TITLE_ID = 'parlamentar-preview-title'

/** Drawer único da página — renderizado uma vez fora do loop de cards. */
export function ParlamentarPreviewDrawer() {
  const { openItem, close } = usePreview()
  return (
    <Drawer
      onOpenChange={(o) => {
        if (!o) close()
      }}
      open={openItem !== null}
      position="right"
      size="lg"
    >
      <DrawerContent aria-labelledby={TITLE_ID}>
        {openItem ? <PreviewBody data={openItem} onNavigate={close} /> : null}
      </DrawerContent>
    </Drawer>
  )
}

function PreviewBody({
  data,
  onNavigate,
}: {
  data: ParlamentarPreviewData
  onNavigate: () => void
}) {
  const cargo = data.casa === 'CAMARA' ? 'Deputado' : 'Senador'
  const state = classifyAlinhamentoCard(
    data.votacoesAnalisadas,
    data.pctAlinhamento,
    data.casa,
    data.partidoSigla,
  )
  return (
    <>
      <DrawerHeader>
        <div className="flex items-start gap-3">
          <ParlamentarAvatar
            className="size-20 shrink-0"
            nome={data.nome}
            size="2xl"
            urlFoto={data.urlFoto}
          />
          <div className="min-w-0 flex-1">
            <h2
              className="font-semibold text-fg-primary text-lg leading-snug"
              id={TITLE_ID}
            >
              {data.nome}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-tertiary text-sm">
              <span>{cargo}</span>
              <PartyBadge sigla={data.partidoSigla} size="sm" />
              <span aria-hidden>·</span>
              <span>{data.uf}</span>
            </div>
          </div>
        </div>
      </DrawerHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-2">
          <h3 className="font-medium text-fg-secondary text-sm">
            Alinhamento à bancada
          </h3>
          <AlinhamentoStrip state={state} />
        </section>

        <section className="space-y-2">
          <h3 className="font-medium text-fg-secondary text-sm">
            Resumo do mandato
          </h3>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-default bg-line-default">
            <PreviewStat
              label="Proposições"
              value={
                typeof data.proposicoesCount === 'number'
                  ? String(data.proposicoesCount)
                  : '—'
              }
            />
            <PreviewStat
              hint={
                data.percentilGastoCasa != null
                  ? `percentil ${Math.round(Number(data.percentilGastoCasa))} na ${data.casa === 'CAMARA' ? 'Câmara' : 'Senado'}`
                  : undefined
              }
              label="Gasto no ano"
              value={formatBRL(data.gastoTotalAno)}
            />
          </dl>
          <p className="text-fg-quaternary text-xs">
            Gasto = cota parlamentar (CEAP) no ano corrente.
          </p>
        </section>
      </div>

      <DrawerFooter>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/parlamentares/${data.id}`} onClick={onNavigate}>
              Ver perfil completo
            </Link>
          </Button>
          {data.follow ? (
            <FollowButton
              initialIsFollowing={data.follow.isFollowing}
              parlamentarId={data.id}
              parlamentarNome={data.nome}
            />
          ) : null}
        </div>
      </DrawerFooter>
    </>
  )
}

function PreviewStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="bg-surface-base px-3 py-3">
      <dt className="text-fg-tertiary text-xs">{label}</dt>
      <dd className="mt-0.5 font-semibold text-base text-fg-primary tabular-nums">
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-fg-quaternary text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
