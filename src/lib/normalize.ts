// Normalização canônica de nomes para match determinístico entre fontes.
// Mesmo algoritmo do vínculo de emendas por nome (ingestion/cgu/emendas-mapper
// normalizeNomeAutor) — replicado aqui porque ingestion/ está fora do build
// Next (tsconfig exclui) e o app não pode importar de lá.
//
// Uso atual: ponte município TSE↔IBGE do confronto emendas×colégio (ADR-066
// D5) — o TSE identifica municípios por código próprio e a CGU pelo código
// IBGE; o casamento é por nome normalizado + UF. Ambas as fontes emitem
// MAIÚSCULAS; o risco real é acento e espaçamento, não caixa.

export function normalizeNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}
