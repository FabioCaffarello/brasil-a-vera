import type { CamaraDeputadoDetalhe } from './deputado-detalhe-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente.

// Forma canônica de um CPF: 11 dígitos, sem pontuação. Câmara e TSE já
// entregam nesse formato, mas normalizamos defensivamente (strip de tudo que
// não é dígito) e validamos o comprimento. Qualquer coisa que não resulte em
// exatamente 11 dígitos vira null → o parlamentar fica NÃO-vinculável (regra
// travada do Inc 0: só CPF exato, nada de heurística).
//
// Nota: NÃO validamos os dígitos verificadores do CPF de propósito — a fonte
// é oficial (Câmara/TSE) e a chave de junção precisa bater exatamente com o
// que o TSE publica, dígitos verificadores inválidos inclusos, se houver.
export function normalizeCpf(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const digits = raw.replace(/\D/g, '')
  return /^\d{11}$/.test(digits) ? digits : null
}

export interface CpfUpdate {
  sourceId: string
  cpf: string | null
}

export function mapDeputadoDetalheCpf(input: CamaraDeputadoDetalhe): CpfUpdate {
  return {
    sourceId: input.dados.id,
    cpf: normalizeCpf(input.dados.cpf),
  }
}
