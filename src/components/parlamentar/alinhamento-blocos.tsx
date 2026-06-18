// Alinhamento com a orientação de blocos institucionais (Governo/Oposição),
// ADR-040. Moldura neutra OBRIGATÓRIA: termo é "alinhamento com a orientação";
// proibido fidelidade/rebeldia/traição. Sem score que ranqueie, sem cor que
// sugira juízo (nada de verde=bom/vermelho=ruim). Mostra contagem factual +
// quais votações; o cidadão conclui. Câmara-only (Senado não publica fonte).

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { BlocoAlinhamentoResult } from '@/lib/queries/alinhamento'

interface Props {
  blocos: BlocoAlinhamentoResult[]
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

function BlocoCard({ bloco }: { bloco: BlocoAlinhamentoResult }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-fg-secondary text-sm">
        Orientação do {bloco.bloco}
      </h3>
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

export function AlinhamentoBlocos({ blocos }: Props) {
  const comDados = blocos.filter((b) => b.total > 0)

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
        <BlocoCard bloco={b} key={b.bloco} />
      ))}
    </div>
  )
}
