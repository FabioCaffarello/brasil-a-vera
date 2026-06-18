// Detecção determinística de federação partidária (ADR-041).
//
// As 3 federações vigentes na legislatura 2023–2026. Este módulo responde
// apenas à pergunta verificável "este partido está em federação?" — um FATO
// DE DETECÇÃO baseado em allowlist pública e estática.
//
// NÃO infere orientação de voto nem calcula alinhamento. A Câmara publica a
// orientação da federação sob uma sigla própria ("Fdr PT-PCdoB-PV"), e esse
// parse é uma decisão de invariante adiada (ver ADR-041 / ADR futuro). Aqui o
// fato de federação serve só para SUPRIMIR um número de alinhamento partidário
// e EXPLICAR honestamente sua ausência — nunca para produzir um número.
//
// Compartilhado entre app (Worker) e ingestion (Node 22) via `@/shared/federacoes`.
//
// Pendência rastreada (ADR-041 "Negativas"): a grafia exata das siglas em
// `parlamentar.partido_sigla` (PCdoB vs PCDOB, Cidadania vs CIDADANIA) ainda
// não foi confirmada com `SELECT DISTINCT` por causa da cota Neon esgotada
// (reset 2026-07-01). A comparação é case-insensitive como mitigação.

export interface Federacao {
  /** Nome da federação como referência humana (UI/copy). */
  nome: string
  /** Siglas-membro, em UPPERCASE — comparação normaliza para este formato. */
  siglas: readonly string[]
}

export const FEDERACOES: readonly Federacao[] = [
  {
    nome: 'Federação Brasil da Esperança (FE BRASIL)',
    siglas: ['PT', 'PCDOB', 'PV'],
  },
  { nome: 'Federação PSOL REDE', siglas: ['PSOL', 'REDE'] },
  { nome: 'Federação PSDB Cidadania', siglas: ['PSDB', 'CIDADANIA'] },
] as const

/**
 * Retorna a federação à qual o partido pertence, ou `null` se não federado.
 * Comparação case-insensitive (a grafia em `partido_sigla` varia entre fontes).
 */
export function federacaoDoPartido(
  partidoSigla: string | null | undefined,
): Federacao | null {
  if (!partidoSigla) return null
  const norm = partidoSigla.trim().toUpperCase()
  return FEDERACOES.find((f) => f.siglas.includes(norm)) ?? null
}

/** `true` se o partido integra uma das federações vigentes. */
export function emFederacao(partidoSigla: string | null | undefined): boolean {
  return federacaoDoPartido(partidoSigla) !== null
}
