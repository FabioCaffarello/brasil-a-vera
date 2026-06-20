import type { FiliacaoPeriodo } from '../shared/filiacao'

// Deriva períodos de filiação a partir do histórico do deputado
// (`/deputados/{id}/historico`), que NÃO entrega períodos prontos: traz uma
// série de eventos (posse, troca de partido, afastamento…) cada um com
// `dataHora` + `siglaPartido`. Colapsamos eventos consecutivos do MESMO partido
// num único período; a troca de partido fecha o período anterior e abre o novo.
//
// L1: datas e siglas são oficiais; o colapso é determinístico, sem inferência.

export interface HistoricoEvento {
  dataHora: string
  siglaPartido: string | null | undefined
}

export function collapseHistoricoToFiliacoes(
  eventos: HistoricoEvento[],
): FiliacaoPeriodo[] {
  const ordenados = eventos
    .filter(
      (e): e is { dataHora: string; siglaPartido: string } =>
        e.siglaPartido != null && e.siglaPartido !== '' && Boolean(e.dataHora),
    )
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))

  const periodos: FiliacaoPeriodo[] = []
  for (const e of ordenados) {
    const data = e.dataHora.slice(0, 10) // YYYY-MM-DD
    const ultimo = periodos[periodos.length - 1]
    if (ultimo && ultimo.partidoSigla === e.siglaPartido) {
      // Mesmo partido em sequência: mantém o início, ignora eventos internos.
      continue
    }
    if (ultimo) {
      // Troca de partido: fecha o período anterior na data da troca.
      ultimo.dataFim = data
    }
    periodos.push({
      partidoSigla: e.siglaPartido,
      dataInicio: data,
      dataFim: null,
    })
  }
  return periodos
}
