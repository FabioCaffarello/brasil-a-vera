'use client'

import { Button } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import { createPreview } from '@/components/preview/create-preview'
import { MargemDecisaoBar } from '@/components/votacao/margem-decisao'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/design-system/primitives/rds-drawer'
import { formatDataBR } from '@/lib/format'

// Dados do preview = exatamente o que o VotacaoCard já recebe como props
// (de listVotacoesCursor). Zero fetch novo: o drawer é a descrição completa +
// margem + resumo dos votos, tudo derivado desses campos. "Votos por partido"
// e individuais NÃO entram aqui — exigiriam JOIN por clique (viola princípio
// 8); o CTA leva ao perfil onde a seção já existe.
export interface VotacaoPreviewData {
  id: string
  casa: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
  abstencoes: number
}

const { Provider, usePreview, PreviewLink } =
  createPreview<VotacaoPreviewData>()

/** Envolve a grid da listagem; mantém o estado do drawer único da página. */
export const VotacaoPreviewProvider = Provider

/**
 * Link do card que abre o drawer de preview no clique (progressive
 * enhancement). Sem JS / fora da listagem (ex.: /busca) é um <a href> normal
 * para o detalhe.
 */
export const VotacaoPreviewLink = PreviewLink

const TITLE_ID = 'votacao-preview-title'

/** Drawer único da página — renderizado uma vez fora do loop de cards. */
export function VotacaoPreviewDrawer() {
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
  data: VotacaoPreviewData
  onNavigate: () => void
}) {
  const href = `/votacoes/${data.id}`
  const casaLabel = data.casa === 'CAMARA' ? 'Câmara' : 'Senado'
  return (
    <>
      <DrawerHeader>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-xs">
            <span className="flex flex-wrap items-center gap-2">
              <span>{formatDataBR(data.dataHora)}</span>
              <span aria-hidden>·</span>
              <span>{casaLabel}</span>
              <span aria-hidden>·</span>
              <span>{data.orgao}</span>
            </span>
            <span
              className={
                data.aprovada
                  ? 'rounded bg-success/20 px-2 py-0.5 font-medium text-fg-success text-xs'
                  : 'rounded bg-error/20 px-2 py-0.5 font-medium text-fg-error text-xs'
              }
            >
              {data.aprovada ? 'Aprovada' : 'Rejeitada'}
            </span>
          </div>
          <h2
            className="font-semibold text-base text-fg-primary leading-snug"
            id={TITLE_ID}
          >
            {data.descricao}
          </h2>
        </div>
      </DrawerHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-2">
          <h3 className="font-medium text-fg-secondary text-sm">
            Margem da decisão
          </h3>
          <MargemDecisaoBar
            aprovada={data.aprovada}
            votosNao={data.votosNao}
            votosSim={data.votosSim}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-medium text-fg-secondary text-sm">
            Resumo dos votos
          </h3>
          <VotosResumo
            totais={{
              sim: data.votosSim,
              nao: data.votosNao,
              abstencoes: data.abstencoes,
              ausentes: null,
            }}
          />
        </section>
      </div>

      <DrawerFooter>
        <Button asChild>
          <Link href={href} onClick={onNavigate}>
            Ver perfil completo
          </Link>
        </Button>
      </DrawerFooter>
    </>
  )
}
