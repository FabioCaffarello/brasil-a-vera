'use client'

import { Button } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import { createPreview } from '@/components/preview/create-preview'
import {
  situacaoClasses,
  situacaoLabel,
} from '@/components/proposicao/situacao'
import { TramitacaoStrip } from '@/components/proposicao/tramitacao-strip'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/design-system/primitives/rds-drawer'
import { formatProposicaoRef } from '@/lib/format'
import { classifyTramitacaoCard } from '@/modules/proposicoes/domain/tramitacao-card'

// Dados do preview = exatamente o que o ProposicaoCard já recebe como props.
// Zero fetch novo: o drawer é a ementa completa + barra de tramitação + stats,
// tudo derivado desses campos.
export interface ProposicaoPreviewData {
  tipo: string
  numero: number
  ano: number
  ementa: string
  situacao: string
  nEventosTramitacao?: number | null
  nAutores?: number | null
  nVotacoes?: number | null
  diasEmTramitacao?: number | null
  diasDesdeUltimaTramitacao?: number | null
  ultimoOrgao?: string | null
}

const { Provider, usePreview, PreviewLink } =
  createPreview<ProposicaoPreviewData>()

/** Envolve a grid da listagem; mantém o estado do drawer único da página. */
export const ProposicaoPreviewProvider = Provider

/**
 * Link do card que abre o drawer de preview no clique (progressive
 * enhancement). Sem JS / fora da listagem é um <a href> normal para o detalhe.
 */
export const ProposicaoPreviewLink = PreviewLink

const TITLE_ID = 'proposicao-preview-title'

/** Drawer único da página — renderizado uma vez fora do loop de cards. */
export function ProposicaoPreviewDrawer() {
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
  data: ProposicaoPreviewData
  onNavigate: () => void
}) {
  const { tipo, numero, ano, ementa, situacao } = data
  const href = `/proposicoes/${tipo}/${numero}/${ano}`
  const estado = classifyTramitacaoCard({
    nEventosTramitacao: data.nEventosTramitacao,
    ultimoOrgao: data.ultimoOrgao,
    diasEmTramitacao: data.diasEmTramitacao,
    diasDesdeUltimaTramitacao: data.diasDesdeUltimaTramitacao,
  })
  return (
    <>
      <DrawerHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="font-medium font-mono text-fg-tertiary text-sm"
            id={TITLE_ID}
          >
            {formatProposicaoRef(tipo, numero, ano)}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${situacaoClasses(situacao)}`}
          >
            {situacaoLabel(situacao)}
          </span>
        </div>
      </DrawerHeader>

      <div className="space-y-3 px-4 py-4">
        <p className="text-fg-primary text-sm">
          {ementa || (
            <span className="text-fg-quaternary italic">(sem ementa)</span>
          )}
        </p>
        <TramitacaoStrip estado={estado} situacao={situacao} />
        <PreviewStats
          diasEmTramitacao={data.diasEmTramitacao}
          nAutores={data.nAutores}
          nVotacoes={data.nVotacoes}
        />
      </div>

      <DrawerFooter>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={href} onClick={onNavigate}>
              Abrir proposição
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${href}#tramitacao`} onClick={onNavigate}>
              Ver tramitação
            </Link>
          </Button>
        </div>
      </DrawerFooter>
    </>
  )
}

// Mesma regra de honestidade do CardFooter: só renderiza fragmentos com dado
// real; suprime a linha inteira quando todos forem null.
function PreviewStats({
  nAutores,
  nVotacoes,
  diasEmTramitacao,
}: {
  nAutores: number | null | undefined
  nVotacoes: number | null | undefined
  diasEmTramitacao: number | null | undefined
}) {
  const partes: string[] = []
  if (typeof nAutores === 'number' && nAutores > 0) {
    partes.push(`${nAutores} ${nAutores === 1 ? 'autor' : 'autores'}`)
  }
  if (typeof nVotacoes === 'number' && nVotacoes > 0) {
    partes.push(`${nVotacoes} ${nVotacoes === 1 ? 'votação' : 'votações'}`)
  }
  if (typeof diasEmTramitacao === 'number' && diasEmTramitacao > 0) {
    partes.push(
      `${diasEmTramitacao} ${diasEmTramitacao === 1 ? 'dia' : 'dias'}`,
    )
  }
  if (partes.length === 0) return null
  return <p className="text-fg-quaternary text-xs">{partes.join(' · ')}</p>
}
