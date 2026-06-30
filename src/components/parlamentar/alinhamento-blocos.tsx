// Alinhamento com a orientação de blocos institucionais (Governo/Oposição),
// ADR-040. Moldura neutra OBRIGATÓRIA: termo é "alinhamento com a orientação";
// proibido fidelidade/rebeldia/traição. Sem score que ranqueie, sem cor que
// sugira juízo (nada de verde=bom/vermelho=ruim). Mostra contagem factual +
// quais votações; o cidadão conclui. Câmara-only (Senado não publica fonte).

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type {
  BlocoAlinhamentoResult,
  BlocoComposicao,
} from '@/lib/queries/alinhamento'

interface Props {
  blocos: BlocoAlinhamentoResult[]
  composicao?: BlocoComposicao[]
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

function BlocoCard({
  bloco,
  partidos,
}: {
  bloco: BlocoAlinhamentoResult
  partidos?: string[]
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-medium text-fg-secondary text-sm">
          Orientação do {bloco.bloco}
        </h3>
        {partidos && partidos.length > 0 && (
          <details className="inline">
            <summary className="cursor-pointer list-none text-fg-tertiary text-xs hover:text-fg-secondary">
              ver partidos ▸
            </summary>
            <span className="block text-fg-tertiary text-xs">
              {partidos.join(' · ')}
            </span>
          </details>
        )}
      </div>
      <p className="text-fg-primary text-sm">
        Em <strong className="tabular-nums">{bloco.total}</strong> votações com
        orientação do {bloco.bloco}, o voto coincidiu em{' '}
        <strong className="tabular-nums">{bloco.alinhados}</strong> e divergiu
        em <strong className="tabular-nums">{bloco.divergentes}</strong>.
      </p>
      {bloco.amostraInsuficiente && (
        <p className="text-fg-tertiary text-xs">
          Amostra pequena — leia como indicativo, não como medida consolidada.
        </p>
      )}
      {bloco.votacoes.length > 0 && (
        <ul className="space-y-1.5">
          {bloco.votacoes.map((v) => (
            <li className="text-fg-primary text-sm" key={v.votacaoId}>
              <span className="tabular-nums text-fg-tertiary text-xs">
                {formatDataBR(v.dataHora)}
              </span>{' '}
              — <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
              <span className="text-fg-tertiary text-xs">
                (votou {v.voto}, orientação do {bloco.bloco} {v.orientacao})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AlinhamentoBlocos({ blocos, composicao = [] }: Props) {
  const comDados = blocos.filter((b) => b.total > 0)
  const composicaoMap = new Map(composicao.map((c) => [c.nome, c.partidos]))

  if (comDados.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Ainda não há votações nominais deste parlamentar coincidentes com
        orientação registrada de Governo ou Oposição na API da Câmara. A
        cobertura cresce a cada execução do cron (4×/dia) conforme novas
        votações e orientações entrarem.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-fg-tertiary text-sm">
        Comparação factual entre o voto individual e a orientação formalizada
        pelas lideranças do Governo e da Oposição na Câmara. É uma referência de
        leitura, não um juízo: votos AUSENTE e orientações LIBERADO não entram
        na conta.
      </p>
      {comDados.map((b) => (
        <BlocoCard
          bloco={b}
          key={b.bloco}
          partidos={composicaoMap.get(b.bloco)}
        />
      ))}
    </div>
  )
}
