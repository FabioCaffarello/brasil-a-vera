import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'
import {
  classifyTramitacaoCard,
  type EstadoTramitacaoCard,
  inferirMarcoAtual,
  MARCOS_TRAMITACAO,
} from '@/modules/proposicoes/domain/tramitacao-card'

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
 * - TRAMITANDO: active, em progresso → bg-brand/20 + text-brand (subtle)
 * - APROVADA: outcome positivo → bg-success/20 + text-success (subtle)
 * - REJEITADA: outcome negativo → bg-destructive/20 + text-destructive
 * - ARQUIVADA: inativo → bg-surface-elevated + text-foreground-muted
 * - TRANSFORMADA_EM_NORMA: pinnacle outcome (lei!) → bg-success solid
 *   text-success-foreground. Visual hierarchy: solid > subtle.
 */
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-brand/20 text-brand',
  APROVADA: 'bg-success/20 text-success',
  REJEITADA: 'bg-destructive/20 text-destructive',
  ARQUIVADA: 'bg-surface-elevated text-foreground-muted',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

const SITUACOES_TERMINAIS_NEGATIVAS = new Set(['REJEITADA', 'ARQUIVADA'])

/**
 * Card de listagem de proposição — Sprint 6.2 PR 2 (Wave 6) +
 * Wave 8 Sprint 8.1 PR4 (v2: mini-barra de progresso + footer compacto).
 *
 * Wave 8 PR4 adiciona, consumindo `estatistica_proposicao_agregada`:
 * - Mini-barra de progresso de 5 marcos (CSS-only, 4px). Renderização
 *   condicionada ao contrato de fallback (P2 — honestidade):
 *   - `com_marcos` (n_eventos ≥ 3 AND ultimo_orgao): barra + label
 *   - `sem_marcos_relevantes` (1-2 eventos): "Apresentada há N dias"
 *   - `sem_tramitacao_registrada` (0 eventos): "Sem tramitação registrada"
 *   - `obsoleto` (dias_desde_ultima > 365): barra + tooltip de aviso
 * - Footer "N autores · M votações · X dias" — só renderiza campos que
 *   o agregado preencheu (suprime fragmento se valor for null).
 */
export function ProposicaoCard({ proposicao }: Props) {
  const { tipo, numero, ano, ementa, situacao } = proposicao
  const href = `/proposicoes/${tipo}/${numero}/${ano}`
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
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={href}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium font-mono text-foreground-muted text-sm">
          {formatProposicaoRef(tipo, numero, ano)}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${situacaoClasses}`}
        >
          {SITUACAO_LABELS[situacao] ?? situacao}
        </span>
      </div>
      <p className="line-clamp-3 text-foreground text-sm">
        {ementa || (
          <span className="text-foreground-subtle italic">(sem ementa)</span>
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
      <p className="mt-3 text-foreground-subtle text-xs">
        Sem tramitação registrada
      </p>
    )
  }

  if (estado.kind === 'sem_marcos_relevantes') {
    return (
      <p className="mt-3 text-foreground-subtle text-xs">
        Apresentada há {estado.diasEmTramitacao}{' '}
        {estado.diasEmTramitacao === 1 ? 'dia' : 'dias'}
      </p>
    )
  }

  // com_marcos — render barra de 5 segmentos + label "Em {orgao}".
  const marcoAtual = inferirMarcoAtual(estado.ultimoOrgao, situacao)
  const terminalNegativo = SITUACOES_TERMINAIS_NEGATIVAS.has(situacao)
  return (
    <div className="mt-3">
      <div
        aria-label={`Tramitação em ${estado.ultimoOrgao}, marco ${marcoAtual} de ${MARCOS_TRAMITACAO.length}`}
        className="flex gap-0.5"
        role="img"
      >
        {MARCOS_TRAMITACAO.map((marco, idx) => {
          const stepIndex = idx + 1
          const ativo = stepIndex <= marcoAtual
          // Cor difere por: ativo terminal-negativo (destructive),
          // ativo terminal-positivo ou em curso (brand), inativo (muted).
          const fillClass = !ativo
            ? 'bg-surface-elevated'
            : terminalNegativo && stepIndex === marcoAtual
              ? 'bg-destructive/60'
              : 'bg-brand/60'
          return (
            <div
              className={`h-1 flex-1 rounded-sm ${fillClass}`}
              key={marco}
              title={marco}
            />
          )
        })}
      </div>
      <p
        className="mt-1.5 text-foreground-muted text-xs"
        title={
          estado.obsoleto ? 'Sem movimentação há mais de 1 ano' : undefined
        }
      >
        Em{' '}
        <span className="font-medium text-foreground">
          {estado.ultimoOrgao}
        </span>
        {estado.obsoleto ? (
          <span className="ml-1 text-warning">· parada há &gt;1 ano</span>
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
  return (
    <p className="mt-2 text-foreground-subtle text-xs">{partes.join(' · ')}</p>
  )
}
