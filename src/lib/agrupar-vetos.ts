// Agrupa os votos por dispositivo de veto em um resumo por veto.
// Auditoria UX 2026-07-20 (P0.3): a seção "Vetos presidenciais" do perfil
// renderizava um card por dispositivo (~350 cards com título idêntico,
// 39.834px de altura). Um veto = um card, com contagem de votos por direção.

import type { VetoPorSenador } from '@/lib/queries/vetos'

export interface VetoAgrupado {
  vetoId: string
  vetoNumero: string
  vetoAno: number
  vetoEmenta: string
  dispositivosTotal: number
  votosSim: number
  votosNao: number
  votosOutros: number
  /** Data de sessão mais recente entre os dispositivos votados. */
  dataSessao: string | null
  /** Contagem de dispositivos por situação (Mantido/Rejeitado/null=em tramitação). */
  situacoes: { mantidos: number; derrubados: number; emTramitacao: number }
}

export function agruparVetosPorVeto(rows: VetoPorSenador[]): VetoAgrupado[] {
  const porVeto = new Map<string, VetoAgrupado>()

  for (const r of rows) {
    let grupo = porVeto.get(r.vetoId)
    if (!grupo) {
      grupo = {
        vetoId: r.vetoId,
        vetoNumero: r.vetoNumero,
        vetoAno: r.vetoAno,
        vetoEmenta: r.vetoEmenta,
        dispositivosTotal: 0,
        votosSim: 0,
        votosNao: 0,
        votosOutros: 0,
        dataSessao: null,
        situacoes: { mantidos: 0, derrubados: 0, emTramitacao: 0 },
      }
      porVeto.set(r.vetoId, grupo)
    }

    grupo.dispositivosTotal += 1
    if (r.voto === 'SIM') grupo.votosSim += 1
    else if (r.voto === 'NAO') grupo.votosNao += 1
    else grupo.votosOutros += 1

    if (r.situacao === 'Mantido') grupo.situacoes.mantidos += 1
    else if (r.situacao === 'Rejeitado') grupo.situacoes.derrubados += 1
    else grupo.situacoes.emTramitacao += 1

    if (
      r.dataSessao &&
      (!grupo.dataSessao || r.dataSessao > grupo.dataSessao)
    ) {
      grupo.dataSessao = r.dataSessao
    }
  }

  // Preserva a ordem de chegada (query já ordena por data de publicação desc).
  return [...porVeto.values()]
}
