// Presença em votações nominais de plenário (Eixo 1, ADR-045). Server component.
//
// Copy neutra (ADR-045 D4): contagem factual, sem ranking de "faltões", sem cor
// de juízo. A NOTA DE MÉTODO é obrigatória — na Câmara a ausência é inferida
// (sem registro nominal = faltou); no Senado é registrada. Amostra pequena é
// sinalizada (a cobertura de votações nominais de plenário cresce com a ingestão).

import {
  PRESENCA_AMOSTRA_MINIMA,
  type PresencaStats,
} from '@/modules/votacoes/domain/presenca'

interface Props {
  presenca: PresencaStats
  casa: 'CAMARA' | 'SENADO'
}

export function Presenca({ presenca, casa }: Props) {
  if (presenca.elegiveis === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem votações nominais de plenário no período de mandato ingerido para
        este parlamentar. A cobertura cresce a cada execução do cron de
        ingestão.
      </p>
    )
  }

  const metodo =
    casa === 'CAMARA'
      ? 'Na Câmara a ausência é inferida: o registro nominal traz apenas quem votou, então não constar numa votação nominal de plenário conta como ausência.'
      : 'No Senado a ausência é registrada explicitamente na votação.'

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-3xl text-fg-primary tabular-nums">
          {presenca.percentual}%
        </span>
        <span className="text-fg-tertiary text-sm">
          de presença em votações nominais de plenário
        </span>
      </div>

      <p className="text-fg-tertiary text-xs">
        Presente em {presenca.presentes} de {presenca.elegiveis} votações
        nominais de plenário ({presenca.ausencias}{' '}
        {presenca.ausencias === 1 ? 'ausência' : 'ausências'}). Considera só
        votações de plenário (não comissões nem simbólicas), dentro do período
        de mandato. {metodo}
      </p>

      {presenca.amostraInsuficiente ? (
        <p className="rounded-md border border-line-default bg-surface-muted p-2 text-fg-tertiary text-xs">
          Amostra pequena (menos de {PRESENCA_AMOSTRA_MINIMA} votações nominais
          de plenário). O percentual é informativo, mas estatisticamente frágil.
        </p>
      ) : null}
    </div>
  )
}
