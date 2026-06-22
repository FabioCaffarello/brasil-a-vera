// Funções puras (sem rede/banco) — testáveis isoladamente.

// Tipo de evento que conta como sessão deliberativa de plenário (ADR-046).
export const TIPO_SESSAO_DELIBERATIVA = 'Sessão Deliberativa'

// Só sessões deliberativas ENCERRADAS têm lista de presença consolidada
// (canceladas/futuras vêm vazias). Audiências, seminários, reuniões técnicas e
// reuniões de comissão ficam de fora (D1).
export function isSessaoDeliberativaEncerrada(ev: {
  descricaoTipo: string
  situacao?: string | null
}): boolean {
  return (
    ev.descricaoTipo === TIPO_SESSAO_DELIBERATIVA &&
    (ev.situacao ?? '').trim().toLowerCase() === 'encerrada'
  )
}
