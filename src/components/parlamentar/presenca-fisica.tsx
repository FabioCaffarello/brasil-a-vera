// Presença física em sessões deliberativas de plenário (Eixo 1, ADR-046).
// Server component.
//
// DISTINTA de "Participação em votações" (ADR-045): aqui é a frequência à
// sessão (compareceu), não o voto em roll-calls. A copy explicita a diferença
// (D3). Copy neutra (ADR-040 §4): factual, sem ranking, sem cor de juízo.
// Câmara-only (fonte de eventos é da Câmara).

import {
  PRESENCA_AMOSTRA_MINIMA,
  type PresencaStats,
} from '@/modules/votacoes/domain/presenca'

interface Props {
  presenca: PresencaStats
  casa: 'CAMARA' | 'SENADO'
}

export function PresencaFisica({ presenca, casa }: Props) {
  if (casa === 'SENADO') {
    return (
      <p className="text-fg-tertiary text-sm">
        Esta métrica cobre a presença em sessões deliberativas da Câmara (a
        fonte de eventos é da Câmara). Para senadores, veja a participação em
        votações.
      </p>
    )
  }

  if (presenca.elegiveis === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem sessões deliberativas de plenário no período de mandato ingerido
        para este parlamentar. A cobertura cresce a cada execução do cron de
        ingestão.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-3xl text-fg-primary tabular-nums">
          {presenca.percentual}%
        </span>
        <span className="text-fg-tertiary text-sm">
          de presença em sessões deliberativas de plenário
        </span>
      </div>

      <p className="text-fg-tertiary text-xs">
        Presente em {presenca.presentes} de {presenca.elegiveis} sessões
        deliberativas de plenário ({presenca.ausencias}{' '}
        {presenca.ausencias === 1 ? 'ausência' : 'ausências'}), dentro do
        período de mandato. É a <strong>frequência física à sessão</strong> —
        diferente de <strong>participar das votações</strong> (votar em cada
        votação nominal): dá para comparecer à sessão e não votar numa votação
        específica.
      </p>

      {presenca.amostraInsuficiente ? (
        <p className="rounded-md border border-line-default bg-surface-muted p-2 text-fg-tertiary text-xs">
          Amostra pequena (menos de {PRESENCA_AMOSTRA_MINIMA} sessões). O
          percentual é informativo, mas estatisticamente frágil.
        </p>
      ) : null}
    </div>
  )
}
