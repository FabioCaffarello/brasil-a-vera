// Lógica pura de disciplina partidária em votações.
// Princípio: voto AUSENTE e ABSTENCAO não tomam posição, portanto não
// contam para "seguiu/rebelou" nem para o denominador da disciplina.
// LIBERADO equivale a "sem orientação efetiva" — partido sai do cálculo.

export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export type OrientacaoBancada = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'

// Votos que representam posicionamento ativo (entram no denominador da
// disciplina e podem caracterizar rebeldia).
const VOTO_ATIVO: ReadonlySet<TipoVoto> = new Set(['SIM', 'NAO', 'OBSTRUCAO'])

// Orientações que representam direção efetiva da bancada.
const ORIENTACAO_EFETIVA: ReadonlySet<OrientacaoBancada> = new Set([
  'SIM',
  'NAO',
  'OBSTRUCAO',
])

export function isVotoAtivo(voto: TipoVoto): boolean {
  return VOTO_ATIVO.has(voto)
}

export function isOrientacaoEfetiva(orientacao: OrientacaoBancada): boolean {
  return ORIENTACAO_EFETIVA.has(orientacao)
}

// Rebelde: partido orientou direção efetiva (SIM/NAO/OBSTRUCAO),
// parlamentar deu voto ativo diferente da orientação. AUSENTE/ABSTENCAO
// não caracterizam rebeldia.
export function isRebelde(
  voto: TipoVoto,
  orientacao: OrientacaoBancada,
): boolean {
  if (!isOrientacaoEfetiva(orientacao)) return false
  if (!isVotoAtivo(voto)) return false
  return voto !== orientacao
}

export interface DisciplinaPartido {
  partido: string
  orientacao: OrientacaoBancada
  seguiram: number
  rebelaram: number
  totalAtivo: number
  pctDisciplina: number
}

// Calcula a disciplina de um partido para uma votação. Retorna `null` se
// orientação não-efetiva ou se nenhum parlamentar do partido emitiu voto
// ativo — denominador zero é sinal honesto de "sem informação", não 100%.
export function calcularDisciplinaPartido(
  partido: string,
  orientacao: OrientacaoBancada,
  votos: readonly TipoVoto[],
): DisciplinaPartido | null {
  if (!isOrientacaoEfetiva(orientacao)) return null

  let seguiram = 0
  let rebelaram = 0
  let totalAtivo = 0

  for (const voto of votos) {
    if (!isVotoAtivo(voto)) continue
    totalAtivo += 1
    if (voto === orientacao) {
      seguiram += 1
    } else {
      rebelaram += 1
    }
  }

  if (totalAtivo === 0) return null

  return {
    partido,
    orientacao,
    seguiram,
    rebelaram,
    totalAtivo,
    pctDisciplina: (seguiram / totalAtivo) * 100,
  }
}

// Disciplina média entre partidos com orientação efetiva. Usada no KPI
// "Disciplina média" do KpiStrip do detalhe (D1). Retorna `null` quando
// nenhum partido tinha orientação efetiva — slot mostra "—" no UI.
export function calcularDisciplinaMedia(
  disciplinas: readonly DisciplinaPartido[],
): number | null {
  if (disciplinas.length === 0) return null
  const soma = disciplinas.reduce((acc, d) => acc + d.pctDisciplina, 0)
  return soma / disciplinas.length
}
