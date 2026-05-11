// Mapeia `siglaVotoParlamentar` da API do Senado para o enum interno.
// O Senado usa muito mais siglas que a Câmara — codifica diferentes
// motivos de ausência (licença, missão, atividade parlamentar) que para
// nossos fins agrupamos em AUSENTE.

export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const TABLE: Record<string, TipoVoto> = {
  sim: 'SIM',
  s: 'SIM',
  nao: 'NAO',
  n: 'NAO',
  abstencao: 'ABSTENCAO',
  abs: 'ABSTENCAO',
  abst: 'ABSTENCAO',
  // Presente mas não registrou voto: trata como ABSTENCAO (estava presente,
  // não decidiu) — não como AUSENTE.
  'p-nrv': 'ABSTENCAO',
  obstrucao: 'OBSTRUCAO',
  obs: 'OBSTRUCAO',
  // Em votação secreta, só fica registrado que "Votou" — sem direção.
  // Tratamos como ABSTENCAO na nossa taxonomia (voto válido, direção
  // indisponível). NÃO usar SIM nem NAO porque introduziria viés.
  votou: 'ABSTENCAO',
  // Variantes de "ausente" — todas indicam não-presença no plenário:
  ls: 'AUSENTE', // licença saúde
  lp: 'AUSENTE', // licença particular
  lic: 'AUSENTE', // licença
  ap: 'AUSENTE', // atividade parlamentar
  mis: 'AUSENTE', // missão da casa
  na: 'AUSENTE', // não atribuído / dispositivo não citado
  ncom: 'AUSENTE', // não compareceu
  pres: 'AUSENTE', // presidente em exercício (não vota)
}

// Prefixos que indicam ausência efetiva, usados quando a sigla vem como
// texto longo em vez de código curto (ex.: "Presidente (art. 51 RISF)").
const AUSENTE_PREFIXES = ['presidente']

export function mapTipoVotoSenado(input: string): TipoVoto | null {
  const key = normalize(input)
  const exact = TABLE[key]
  if (exact) return exact
  for (const prefix of AUSENTE_PREFIXES) {
    if (key.startsWith(prefix)) return 'AUSENTE'
  }
  return null
}
