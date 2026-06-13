// Cópia-rds de src/components/proposicao/proposicao-card.tsx — onda
// HeroSection (listagem /proposicoes). Original INTOCADO.
//
// Imports preservados (lógica de domínio única, NÃO duplicada):
// - classifyTramitacaoCard / inferirMarcoAtual / isSituacaoTerminalNegativa
//   do módulo de domínio (mesmo precedente do original).
// - BarraProgressoTramitacao → ./barra-progresso-tramitacao LOCAL (cópia
//   verbatim da tradução da piloto-3; barra CSS-only, regra 2 não disparada).
//
// href do card → /rds/proposicoes/[tipo]/[numero]/[ano] (o perfil migrado
// existe sob /rds/ — piloto-3; navegação CONTIDA na staging).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border          → border-line-default
//   bg-surface             → bg-surface-base
//   hover:border-border-strong → hover:border-line-emphasis
//   hover:bg-surface-elevated  → hover:bg-surface-raised
//   ring-ring              → ring-line-focus
//   text-foreground{,-muted,-subtle} → text-fg-{primary,tertiary,quaternary}
//   bg-surface-elevated    → bg-surface-raised
//   text-warning           → text-fg-warning
//   bg-brand/20 text-brand → bg-fg-brand/20 text-fg-brand (byte-idêntico pós-#358)
//   text-success           → text-fg-success (bg-success/N homônimo mantido — ext. piloto-2)
//   bg-destructive/20 text-destructive → bg-error/20 text-fg-error (ext. piloto-2)
//
// Token MANTIDO (resíduo on-color, ADR-024, sem par RDS — ext. piloto-3):
//   bg-success text-success-foreground (badge sólido TRANSFORMADA_EM_NORMA).

import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'
import {
  classifyTramitacaoCard,
  type EstadoTramitacaoCard,
  inferirMarcoAtual,
  isSituacaoTerminalNegativa,
} from '@/modules/proposicoes/domain/tramitacao-card'
import { BarraProgressoTramitacao } from './barra-progresso-tramitacao'

interface Props {
  proposicao: {
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
    // Wave 8 Sprint 8.1 PR4 — agregados consumidos pela v2 do card.
    // Todos opcionais (null/undefined quando a row da agregada não existe
    // — seed ainda não rodou ou proposição recém-ingerida).
    nEventosTramitacao?: number | null
    nAutores?: number | null
    nVotacoes?: number | null
    diasEmTramitacao?: number | null
    diasDesdeUltimaTramitacao?: number | null
    ultimoOrgao?: string | null
  }
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

/**
 * Mapeamento situação → tokens semânticos (mantido vs Sprint 4.2).
 *
 * - TRAMITANDO: active, em progresso → bg-fg-brand/20 + text-fg-brand (subtle)
 * - APROVADA: outcome positivo → bg-success/20 + text-fg-success (subtle)
 * - REJEITADA: outcome negativo → bg-error/20 + text-fg-error
 * - ARQUIVADA: inativo → bg-surface-raised + text-fg-tertiary
 * - TRANSFORMADA_EM_NORMA: pinnacle outcome (lei!) → bg-success solid
 *   text-success-foreground (resíduo on-color, ext. piloto-3). Visual
 *   hierarchy: solid > subtle.
 */
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-fg-brand/20 text-fg-brand',
  APROVADA: 'bg-success/20 text-fg-success',
  REJEITADA: 'bg-error/20 text-fg-error',
  ARQUIVADA: 'bg-surface-raised text-fg-tertiary',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

/**
 * Card de listagem de proposição (cópia-rds). Mesmo contrato do original:
 * ref + badge de situação no topo, ementa (line-clamp-3), mini-barra de
 * tramitação (5 marcos, contrato de fallback exato) e footer compacto.
 */
export function ProposicaoCard({ proposicao }: Props) {
  const { tipo, numero, ano, ementa, situacao } = proposicao
  const href = `/rds/proposicoes/${tipo}/${numero}/${ano}`
  const situacaoClasses =
    SITUACAO_CLASSES[situacao] ?? SITUACAO_CLASSES.ARQUIVADA
  const estado = classifyTramitacaoCard({
    nEventosTramitacao: proposicao.nEventosTramitacao,
    ultimoOrgao: proposicao.ultimoOrgao,
    diasEmTramitacao: proposicao.diasEmTramitacao,
    diasDesdeUltimaTramitacao: proposicao.diasDesdeUltimaTramitacao,
  })
  return (
    <Link
      className="block rounded-lg border border-line-default bg-surface-base p-4 transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
      href={href}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium font-mono text-fg-tertiary text-sm">
          {formatProposicaoRef(tipo, numero, ano)}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${situacaoClasses}`}
        >
          {SITUACAO_LABELS[situacao] ?? situacao}
        </span>
      </div>
      <p className="line-clamp-3 text-fg-primary text-sm">
        {ementa || (
          <span className="text-fg-quaternary italic">(sem ementa)</span>
        )}
      </p>
      <TramitacaoStrip estado={estado} situacao={situacao} />
      <CardFooter
        nAutores={proposicao.nAutores}
        nVotacoes={proposicao.nVotacoes}
        diasEmTramitacao={proposicao.diasEmTramitacao}
      />
    </Link>
  )
}

function TramitacaoStrip({
  estado,
  situacao,
}: {
  estado: EstadoTramitacaoCard
  situacao: string
}) {
  if (estado.kind === 'sem_tramitacao_registrada') {
    return (
      <p className="mt-3 text-fg-quaternary text-xs">
        Sem tramitação registrada
      </p>
    )
  }

  if (estado.kind === 'sem_marcos_relevantes') {
    return (
      <p className="mt-3 text-fg-quaternary text-xs">
        Apresentada há {estado.diasEmTramitacao}{' '}
        {estado.diasEmTramitacao === 1 ? 'dia' : 'dias'}
      </p>
    )
  }

  // com_marcos — render barra de 5 segmentos + label "Em {orgao}".
  // Wave 8 Sprint 8.3 PR4: barra extraída para BarraProgressoTramitacao
  // (compartilhada com SectionCard do detalhe em variant=full).
  const marcoAtual = inferirMarcoAtual(estado.ultimoOrgao, situacao)
  const terminalNegativo = isSituacaoTerminalNegativa(situacao)
  return (
    <div className="mt-3">
      <BarraProgressoTramitacao
        ariaLabel={`Tramitação em ${estado.ultimoOrgao}`}
        currentStep={marcoAtual}
        terminalNegativo={terminalNegativo}
        variant="compact"
      />
      <p
        className="mt-1.5 text-fg-tertiary text-xs"
        title={
          estado.obsoleto ? 'Sem movimentação há mais de 1 ano' : undefined
        }
      >
        Em{' '}
        <span className="font-medium text-fg-primary">
          {estado.ultimoOrgao}
        </span>
        {estado.obsoleto ? (
          <span className="ml-1 text-fg-warning">· parada há &gt;1 ano</span>
        ) : null}
      </p>
    </div>
  )
}

function CardFooter({
  nAutores,
  nVotacoes,
  diasEmTramitacao,
}: {
  nAutores: number | null | undefined
  nVotacoes: number | null | undefined
  diasEmTramitacao: number | null | undefined
}) {
  // Apenas renderiza fragmentos que têm dado real (honestidade P2).
  // Suprime quando todos forem null (proposição sem agregada).
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
  return <p className="mt-2 text-fg-quaternary text-xs">{partes.join(' · ')}</p>
}
