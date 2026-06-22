import type {
  CamaraDeputadoDetalhe,
  CamaraProfissoes,
} from './deputado-detalhe-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente. Extraem o perfil
// biográfico (ADR-049) do detalhe + profissões. Vazio → null (não fabricar).

export interface BioUpdate {
  escolaridade: string | null
  /** YYYY-MM-DD (forma da fonte, compatível com a coluna date). */
  dataNascimento: string | null
  municipioNascimento: string | null
  ufNascimento: string | null
  profissao: string | null
}

function limpar(v: string | null | undefined): string | null {
  return v?.trim() || null
}

export function mapBioDeputado(
  detalhe: CamaraDeputadoDetalhe,
  profissoes: CamaraProfissoes,
): BioUpdate {
  const d = detalhe.dados
  return {
    escolaridade: limpar(d.escolaridade),
    dataNascimento: limpar(d.dataNascimento),
    municipioNascimento: limpar(d.municipioNascimento),
    ufNascimento: limpar(d.ufNascimento),
    profissao: limpar(profissoes.dados[0]?.titulo),
  }
}
