// Presença em reuniões deliberativas de comissão (ADR-061/062).
// Câmara-only — Senado não expõe endpoint equivalente.
// Dados ingeridos semanalmente (janela 90 dias rolling, legislatura atual).
// Seção oculta pelo pai quando a lista está vazia (graceful degradation).

import type { PresencaComissaoItem } from '@/lib/queries/presenca-comissoes'

const TIPO_LABEL: Record<string, string> = {
  'Reunião Deliberativa': 'Reunião Deliberativa',
  'Audiência Pública e Deliberação': 'Audiência Pública c/ Deliberação',
}

interface Props {
  eventos: PresencaComissaoItem[]
}

export function PresencaComissoes({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem reuniões deliberativas de comissão registradas nos últimos 90 dias
        para este parlamentar. A cobertura cresce a cada execução do cron de
        ingestão.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line-default">
      {eventos.map((ev) => (
        <li
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5 text-sm"
          key={`${ev.eventoId}-${ev.dataEvento}`}
        >
          <span className="w-24 shrink-0 font-mono text-fg-tertiary text-xs tabular-nums">
            {new Date(ev.dataEvento).toLocaleDateString('pt-BR', {
              timeZone: 'UTC',
            })}
          </span>
          {ev.orgaoSigla && (
            <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium text-fg-secondary text-xs">
              {ev.orgaoSigla}
            </span>
          )}
          <span className="text-fg-secondary">
            {TIPO_LABEL[ev.descricaoTipo] ?? ev.descricaoTipo}
          </span>
        </li>
      ))}
    </ul>
  )
}
