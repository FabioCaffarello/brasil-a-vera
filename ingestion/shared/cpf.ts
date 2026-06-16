// Forma canônica de um CPF: 11 dígitos, sem pontuação. Compartilhado entre a
// Câmara (enriquecimento de parlamentar.cpf) e o TSE (NR_CPF_CANDIDATO) porque
// a ponte do Eixo 2 exige que os dois lados estejam na MESMA forma para o
// join por igualdade exata.
//
// Normalizamos defensivamente (strip de tudo que não é dígito) e exigimos
// exatamente 11 dígitos; qualquer outra coisa — incluindo as sentinelas do
// TSE ("-1", "-4") — vira null → não-vinculável (regra travada do Inc 0:
// só CPF exato, sem heurística).
//
// NÃO validamos dígitos verificadores de propósito: a chave precisa bater com
// o que a fonte oficial publica, dígito inválido incluso se houver.
export function normalizeCpf(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const digits = raw.replace(/\D/g, '')
  return /^\d{11}$/.test(digits) ? digits : null
}
