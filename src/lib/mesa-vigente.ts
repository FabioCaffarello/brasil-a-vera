// Resolve a composição vigente da Mesa Diretora a partir de linhas com
// data_fim NULL. A fonte não fecha o período de biênios anteriores, então
// prod exibia dois "Presidente" (Arthur Lira, biênio 2023-2025, e Hugo
// Motta) — auditoria UX 2026-07-20, P1.5.
//
// Não dá para deduplicar por cargo: o mapper grava `entidade` constante
// ("Mesa Diretora") e `tipo` colapsa o ordinal (1º/2º Secretário viram
// SECRETARIO_MESA), então N secretários legítimos compartilham a chave.
// A regra usa a COORTE DE ELEIÇÃO: a Mesa inteira toma posse na mesma data
// (início do biênio); linhas de biênios anteriores ficam ~2 anos atrás.
//
// Por casa:
// 1. fica só a maior legislatura;
// 2. dentro dela, ficam as linhas com data_inicio até 1 ano antes da posse
//    mais recente (mesma coorte); linhas sem data_inicio só sobrevivem se
//    nenhuma linha datada existir na casa.

import type { MesaDiretoraEntry } from '@/lib/queries/liderancas'

const UM_ANO_MS = 365 * 24 * 60 * 60 * 1000

export function selecionarMesaVigente(
  rows: MesaDiretoraEntry[],
): MesaDiretoraEntry[] {
  const maxLegislaturaPorCasa = new Map<string, number>()
  for (const r of rows) {
    const atual = maxLegislaturaPorCasa.get(r.casa)
    if (atual === undefined || r.legislatura > atual) {
      maxLegislaturaPorCasa.set(r.casa, r.legislatura)
    }
  }

  const daLegislaturaAtual = rows.filter(
    (r) => r.legislatura === maxLegislaturaPorCasa.get(r.casa),
  )

  const maxPossePorCasa = new Map<string, number>()
  for (const r of daLegislaturaAtual) {
    if (!r.dataInicio) continue
    const t = new Date(r.dataInicio).getTime()
    const atual = maxPossePorCasa.get(r.casa)
    if (atual === undefined || t > atual) maxPossePorCasa.set(r.casa, t)
  }

  return daLegislaturaAtual.filter((r) => {
    const maxPosse = maxPossePorCasa.get(r.casa)
    if (maxPosse === undefined) return true // casa sem nenhuma linha datada
    if (!r.dataInicio) return false
    return new Date(r.dataInicio).getTime() >= maxPosse - UM_ANO_MS
  })
}
