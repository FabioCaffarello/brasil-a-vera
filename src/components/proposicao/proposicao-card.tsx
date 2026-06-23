import { ProposicaoPreviewLink } from '@/components/proposicao/preview-drawer'
import {
  situacaoClasses,
  situacaoLabel,
} from '@/components/proposicao/situacao'
import { TramitacaoStrip } from '@/components/proposicao/tramitacao-strip'
import { formatProposicaoRef } from '@/lib/format'
import { classifyTramitacaoCard } from '@/modules/proposicoes/domain/tramitacao-card'

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
  const estado = classifyTramitacaoCard({
    nEventosTramitacao: proposicao.nEventosTramitacao,
    ultimoOrgao: proposicao.ultimoOrgao,
    diasEmTramitacao: proposicao.diasEmTramitacao,
    diasDesdeUltimaTramitacao: proposicao.diasDesdeUltimaTramitacao,
  })
  return (
    <article className="group h-full rounded-lg border border-line-default bg-surface-base transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-within:border-line-emphasis">
      <ProposicaoPreviewLink
        className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        data={{
          tipo,
          numero,
          ano,
          ementa,
          situacao,
          nEventosTramitacao: proposicao.nEventosTramitacao,
          nAutores: proposicao.nAutores,
          nVotacoes: proposicao.nVotacoes,
          diasEmTramitacao: proposicao.diasEmTramitacao,
          diasDesdeUltimaTramitacao: proposicao.diasDesdeUltimaTramitacao,
          ultimoOrgao: proposicao.ultimoOrgao,
        }}
        href={href}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium font-mono text-fg-tertiary text-sm">
            {formatProposicaoRef(tipo, numero, ano)}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${situacaoClasses(situacao)}`}
          >
            {situacaoLabel(situacao)}
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
      </ProposicaoPreviewLink>
    </article>
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
