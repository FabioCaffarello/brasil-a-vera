// Mapeia o campo `tipoVoto` (PT-BR, vindo da API da Câmara) para o enum
// interno `tipo_voto`. Função pura, testável sem rede/banco.

export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

// Normalizado para minúsculo + sem acentos antes do match.
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const TABLE: Record<string, TipoVoto> = {
  sim: 'SIM',
  s: 'SIM',
  nao: 'NAO',
  n: 'NAO',
  abstencao: 'ABSTENCAO',
  obstrucao: 'OBSTRUCAO',
  ausente: 'AUSENTE',
  // "Artigo 17" do Regimento Interno da Câmara: deputado em licença, não
  // computa para o quórum. Tratamos como ausência ao plenário.
  'artigo 17': 'AUSENTE',
}

export function mapTipoVoto(input: string): TipoVoto | null {
  const key = normalize(input)
  return TABLE[key] ?? null
}
