import type { SenadoDetalhe } from './bio-schema'

// Função pura (sem rede/banco). Extrai nascimento + naturalidade do detalhe do
// senador (ADR-049 emenda). Vazio → null (não fabricar). Senado não traz
// escolaridade nem profissão.

export interface BioSenadoUpdate {
  dataNascimento: string | null
  municipioNascimento: string | null
  ufNascimento: string | null
}

function limpar(v: string | null | undefined): string | null {
  return v?.trim() || null
}

export function mapBioSenador(input: SenadoDetalhe): BioSenadoUpdate {
  const b = input.DetalheParlamentar.Parlamentar.DadosBasicosParlamentar
  return {
    dataNascimento: limpar(b?.DataNascimento),
    municipioNascimento: limpar(b?.Naturalidade),
    ufNascimento: limpar(b?.UfNaturalidade),
  }
}
