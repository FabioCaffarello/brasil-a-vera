// Classificador de direção de proposição — Motor de Coerência (Wave 1).
//
// Princípios canônicos (docs/future/COHERENCE-ENGINE.md):
// - **Falso negativo > falso positivo**: na dúvida, NAO_CLASSIFICADA.
// - **Apenas verbos inequívocos** no MVP — sem NLP, sem ML, sem heurística
//   ambígua. Tudo decidido por palavras-chave verificáveis na ementa.
//
// Função pura, testável sem banco/rede.

export type DirecaoProposicao = 'RESTRITIVA' | 'PERMISSIVA' | 'NAO_CLASSIFICADA'

// Cada termo é uma expressão regular case/acento-insensitive aplicada à
// ementa normalizada. Ordem aqui não importa — usamos detecção independente
// para os 2 grupos e cruzamos no final.

const TERMOS_RESTRITIVOS = [
  'revoga',
  'proibe',
  'veda',
  'criminaliza',
  'restringe',
  'limita',
  'suspende',
  'extingue',
]

const TERMOS_PERMISSIVOS = [
  'autoriza',
  'permite',
  'flexibiliza',
  'amplia',
  'libera',
  'cria',
  'institui',
  'concede',
  'isenta',
]

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
}

function contains(haystack: string, needle: string): boolean {
  // Match por palavra inteira (boundary). Evita "concede" casar em "concedência" etc.
  const re = new RegExp(`\\b${needle}\\b`)
  return re.test(haystack)
}

export function classifyDirecao(
  ementa: string | null | undefined,
): DirecaoProposicao {
  if (!ementa || ementa.trim().length === 0) return 'NAO_CLASSIFICADA'
  const normalized = normalize(ementa)

  const temRestritivo = TERMOS_RESTRITIVOS.some((t) => contains(normalized, t))
  const temPermissivo = TERMOS_PERMISSIVOS.some((t) => contains(normalized, t))

  // Regra de ouro: se a ementa contém verbos de ambas as direções,
  // a direção é ambígua → NAO_CLASSIFICADA.
  if (temRestritivo && temPermissivo) return 'NAO_CLASSIFICADA'
  if (temRestritivo) return 'RESTRITIVA'
  if (temPermissivo) return 'PERMISSIVA'
  return 'NAO_CLASSIFICADA'
}

// Detecta se dois votos do mesmo parlamentar em proposições do mesmo tema
// formam um par contraditório:
// - Direções opostas (uma RESTRITIVA, outra PERMISSIVA)
// - Voto IDÊNTICO (ambos SIM = apoia restringir E apoia permitir; ambos NÃO
//   = opõe restringir E opõe permitir).
// Outras combinações (SIM-restritiva + NÃO-permissiva etc) são COERENTES
// (posição consistente pró-restrição ou pró-permissão).
export function eContraditorio(
  voto1: { direcao: DirecaoProposicao; voto: string },
  voto2: { direcao: DirecaoProposicao; voto: string },
): boolean {
  if (
    voto1.direcao === 'NAO_CLASSIFICADA' ||
    voto2.direcao === 'NAO_CLASSIFICADA'
  ) {
    return false
  }
  if (voto1.direcao === voto2.direcao) return false
  // Direções opostas. Contradição quando os votos são iguais.
  return voto1.voto === voto2.voto
}
