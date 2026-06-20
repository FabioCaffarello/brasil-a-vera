// Confronto de coerência com o partido ao longo do mandato (Eixo 1, ADR-043).
//
// Renderiza, lado a lado mas SEPARADAS (D1), as duas referências do partido —
// nunca fundidas numa métrica só:
//   - maioria efetiva da bancada (L2);
//   - orientação formalizada pela liderança (L1).
// Mais a timeline factual de migração partidária (D3).
//
// Copy neutra (ADR-040 §4 + ADR-043 D2): cada bloco NOMEIA sua fonte; nada de
// "fidelidade"/"rebeldia"/"traição"; sem score de ranqueamento; sem cor de
// juízo (verde=bom/vermelho=ruim). Só contagem factual — o cidadão conclui.

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type {
  FidelidadeBancadaResult,
  FidelidadeOrientacaoResult,
} from '@/lib/queries/fidelidade'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'
import type { TimelineMigracao } from '@/modules/parlamentares/domain/fidelidade'

interface Props {
  timeline: TimelineMigracao
  bancada: FidelidadeBancadaResult
  orientacao: FidelidadeOrientacaoResult
}

function VotacaoLink({
  votacaoId,
  descricao,
}: {
  votacaoId: string
  descricao: string
}) {
  return (
    <Link
      className="text-fg-primary hover:text-fg-tertiary hover:underline"
      href={`/votacoes/${votacaoId}`}
    >
      {descricao}
    </Link>
  )
}

// Timeline factual (D3): períodos em ordem cronológica, sem rótulo de
// deslealdade. Período vigente (sem data_fim) marcado como "atual".
function TimelineMigracaoView({ timeline }: { timeline: TimelineMigracao }) {
  if (timeline.periodos.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem histórico de filiação partidária ingerido para este parlamentar.
      </p>
    )
  }

  const headline =
    timeline.trocas === 0
      ? 'Sem troca de partido no histórico ingerido.'
      : `Trocou de partido ${timeline.trocas} ${
          timeline.trocas === 1 ? 'vez' : 'vezes'
        } no histórico ingerido.`

  return (
    <div className="space-y-3">
      <p className="text-fg-secondary text-sm">{headline}</p>
      <ol className="space-y-2">
        {timeline.periodos.map((p) => (
          <li
            className="flex items-baseline gap-2 text-sm"
            key={`${p.partidoSigla}-${p.dataInicio}`}
          >
            <span className="font-medium text-fg-primary">
              {p.partidoSigla}
            </span>
            <span className="tabular-nums text-fg-tertiary text-xs">
              {formatDataBR(p.dataInicio)} —{' '}
              {p.dataFim ? formatDataBR(p.dataFim) : 'atual'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

interface ConfrontoVotacao {
  votacaoId: string
  dataHora: Date | string
  descricao: string
  party: string
}

// Bloco genérico de um confronto (D1: cada um nomeia sua fonte; sem cor de
// juízo). `detalhe` renderiza o sufixo factual por votação (voto / orientação).
function ConfrontoBlock<T extends ConfrontoVotacao>({
  titulo,
  fonte,
  nivel,
  total,
  alinhados,
  divergentes,
  percentual,
  amostraInsuficiente,
  topDivergencias,
  topConvergencias,
  detalhe,
  vazio,
}: {
  titulo: string
  fonte: string
  nivel: 'L1' | 'L2'
  total: number
  alinhados: number
  divergentes: number
  percentual: number | null
  amostraInsuficiente: boolean
  topDivergencias: T[]
  topConvergencias: T[]
  detalhe: (v: T) => string
  vazio: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-base text-fg-primary">{titulo}</h3>
        <p className="text-fg-tertiary text-xs">
          <span className="font-medium">{nivel}</span> · {fonte}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-fg-tertiary text-sm">{vazio}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-3xl text-fg-primary tabular-nums">
              {divergentes}
            </span>
            <span className="text-fg-tertiary text-sm">
              {divergentes === 1
                ? 'votação divergente'
                : 'votações divergentes'}{' '}
              de {total} comparáveis ({alinhados} coincidentes
              {percentual !== null ? `, ${percentual}% coincidência` : ''})
            </span>
          </div>

          {amostraInsuficiente ? (
            <p className="rounded-md border border-line-default bg-surface-muted p-2 text-fg-tertiary text-xs">
              Amostra pequena (menos de {ALINHAMENTO_AMOSTRA_MINIMA} votações
              comparáveis). Os números são informativos, mas estatisticamente
              frágeis.
            </p>
          ) : null}

          {topDivergencias.length > 0 ? (
            <div>
              <h4 className="mb-1.5 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
                Votações em que divergiu (mais recentes)
              </h4>
              <ul className="space-y-1.5">
                {topDivergencias.map((v) => (
                  <li className="text-fg-primary text-sm" key={v.votacaoId}>
                    <span className="tabular-nums text-fg-tertiary text-xs">
                      {formatDataBR(v.dataHora)}
                    </span>{' '}
                    ·{' '}
                    <span className="text-fg-tertiary text-xs">{v.party}</span>{' '}
                    —{' '}
                    <VotacaoLink
                      votacaoId={v.votacaoId}
                      descricao={v.descricao}
                    />{' '}
                    <span className="text-fg-tertiary text-xs">
                      {detalhe(v)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {topConvergencias.length > 0 ? (
            <div>
              <h4 className="mb-1.5 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
                Votações em que coincidiu (mais recentes)
              </h4>
              <ul className="space-y-1.5">
                {topConvergencias.map((v) => (
                  <li className="text-fg-primary text-sm" key={v.votacaoId}>
                    <span className="tabular-nums text-fg-tertiary text-xs">
                      {formatDataBR(v.dataHora)}
                    </span>{' '}
                    ·{' '}
                    <span className="text-fg-tertiary text-xs">{v.party}</span>{' '}
                    —{' '}
                    <VotacaoLink
                      votacaoId={v.votacaoId}
                      descricao={v.descricao}
                    />{' '}
                    <span className="text-fg-tertiary text-xs">
                      {detalhe(v)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export function FidelidadePartidaria({ timeline, bancada, orientacao }: Props) {
  return (
    <div className="space-y-6">
      <TimelineMigracaoView timeline={timeline} />

      <div className="border-line-default border-t pt-5">
        <ConfrontoBlock
          titulo="Votou diferente da maioria da bancada"
          fonte="maioria efetiva dos votos da bancada do partido vigente na data, derivada dos votos nominais"
          nivel="L2"
          total={bancada.stats.total}
          alinhados={bancada.stats.alinhados}
          divergentes={bancada.stats.divergentes}
          percentual={bancada.stats.percentual}
          amostraInsuficiente={bancada.amostraInsuficiente}
          topDivergencias={bancada.topDivergencias}
          topConvergencias={bancada.topConvergencias}
          detalhe={(v) => `(votou ${v.voto})`}
          vazio="Nenhuma votação com posição de maioria apurável: a bancada precisa de quórum mínimo de votos válidos (SIM/NÃO) na data, senão a votação fica de fora — não se fabrica posição."
        />
      </div>

      <div className="border-line-default border-t pt-5">
        <ConfrontoBlock
          titulo="Divergiu da orientação da liderança"
          fonte="orientação formalizada pela liderança do partido vigente na data do voto"
          nivel="L1"
          total={orientacao.stats.total}
          alinhados={orientacao.stats.alinhados}
          divergentes={orientacao.stats.divergentes}
          percentual={orientacao.stats.percentual}
          amostraInsuficiente={orientacao.amostraInsuficiente}
          topDivergencias={orientacao.topDivergencias}
          topConvergencias={orientacao.topConvergencias}
          detalhe={(v) => `(votou ${v.voto}, liderança ${v.orientacao})`}
          vazio="Nenhuma votação com orientação registrada da liderança do partido vigente nas votações ingeridas."
        />
      </div>
    </div>
  )
}
