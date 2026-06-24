import { desc, eq, inArray } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { dispositivoVeto, veto, votoVeto } from '@/shared/db/schema'

// Queries para vetos presidenciais (ADR-059). Cache 24h (TTL.vetos) —
// ingestão mensal, resultados quase-imutáveis após apuração.

export interface VetoListItem {
  id: string
  sourceId: string
  numero: string
  ano: number
  ementa: string
  assunto: string | null
  vetoTotal: boolean
  emTramitacao: boolean
  dataPublicacao: string | null
  materiaVetadaSigla: string | null
  materiaVetadaNumero: string | null
  materiaVetadaAno: number | null
}

export interface DispositivoDetalhe {
  id: string
  sourceId: string
  identificador: string
  descricao: string | null
  assunto: string | null
  situacao: string | null
  tipoVotacao: string | null
  dataSessao: string | null
}

export interface VotoDetalhe {
  dispositivoId: string
  nomeRaw: string
  partidoRaw: string | null
  ufRaw: string | null
  voto: string
  parlamentarId: string | null
}

export interface VetoDetalhe extends VetoListItem {
  materiaVetadaEmenta: string | null
  dataRecebimentoCongresso: string | null
  dispositivos: Array<DispositivoDetalhe & { votos: VotoDetalhe[] }>
}

export interface VetoPorSenador {
  vetoId: string
  vetoNumero: string
  vetoAno: number
  vetoEmenta: string
  dispositivoId: string
  dispositivoIdentificador: string
  situacao: string | null
  dataSessao: string | null
  voto: string
}

export async function getVetosByAno(ano: number): Promise<VetoListItem[]> {
  return cached(`vetos:lista:${ano}`, TTL.vetos, async () => {
    const rows = await db
      .select({
        id: veto.id,
        sourceId: veto.sourceId,
        numero: veto.numero,
        ano: veto.ano,
        ementa: veto.ementa,
        assunto: veto.assunto,
        vetoTotal: veto.vetoTotal,
        emTramitacao: veto.emTramitacao,
        dataPublicacao: veto.dataPublicacao,
        materiaVetadaSigla: veto.materiaVetadaSigla,
        materiaVetadaNumero: veto.materiaVetadaNumero,
        materiaVetadaAno: veto.materiaVetadaAno,
      })
      .from(veto)
      .where(eq(veto.ano, ano))
      .orderBy(desc(veto.dataPublicacao))

    return rows.map((r) => ({
      ...r,
      dataPublicacao: r.dataPublicacao as string | null,
    }))
  })
}

export async function getVetoDetalhe(
  sourceId: string,
): Promise<VetoDetalhe | null> {
  return cached(`vetos:detalhe:${sourceId}`, TTL.vetos, async () => {
    const vetoRows = await db
      .select()
      .from(veto)
      .where(eq(veto.sourceId, sourceId))
      .limit(1)

    if (vetoRows.length === 0) return null
    const v = vetoRows[0]

    const dispRows = await db
      .select({
        id: dispositivoVeto.id,
        sourceId: dispositivoVeto.sourceId,
        identificador: dispositivoVeto.identificador,
        descricao: dispositivoVeto.descricao,
        assunto: dispositivoVeto.assunto,
        situacao: dispositivoVeto.situacao,
        tipoVotacao: dispositivoVeto.tipoVotacao,
        dataSessao: dispositivoVeto.dataSessao,
      })
      .from(dispositivoVeto)
      .where(eq(dispositivoVeto.vetoId, v.id))
      .orderBy(dispositivoVeto.identificador)

    const votosByDisp: Record<string, VotoDetalhe[]> = {}
    if (dispRows.length > 0) {
      const dispIds = dispRows.map((d) => d.id)
      const allVotos = await db
        .select({
          dispositivoId: votoVeto.dispositivoId,
          nomeRaw: votoVeto.nomeRaw,
          partidoRaw: votoVeto.partidoRaw,
          ufRaw: votoVeto.ufRaw,
          voto: votoVeto.voto,
          parlamentarId: votoVeto.parlamentarId,
        })
        .from(votoVeto)
        .where(inArray(votoVeto.dispositivoId, dispIds))

      for (const row of allVotos) {
        const key = row.dispositivoId
        if (!votosByDisp[key]) votosByDisp[key] = []
        votosByDisp[key].push(row)
      }
    }

    return {
      id: v.id,
      sourceId: v.sourceId,
      numero: v.numero,
      ano: v.ano,
      ementa: v.ementa,
      assunto: v.assunto,
      vetoTotal: v.vetoTotal,
      emTramitacao: v.emTramitacao,
      dataPublicacao: v.dataPublicacao as string | null,
      materiaVetadaSigla: v.materiaVetadaSigla,
      materiaVetadaNumero: v.materiaVetadaNumero,
      materiaVetadaAno: v.materiaVetadaAno,
      materiaVetadaEmenta: v.materiaVetadaEmenta,
      dataRecebimentoCongresso: v.dataRecebimentoCongresso as string | null,
      dispositivos: dispRows.map((d) => ({
        id: d.id,
        sourceId: d.sourceId,
        identificador: d.identificador,
        descricao: d.descricao,
        assunto: d.assunto,
        situacao: d.situacao,
        tipoVotacao: d.tipoVotacao,
        dataSessao: d.dataSessao as string | null,
        votos: votosByDisp[d.id] ?? [],
      })),
    }
  })
}

// Retorna os vetos em que o senador votou — útil para a seção no perfil.
export async function getVotosByParlamentar(
  parlamentarId: string,
): Promise<VetoPorSenador[]> {
  return cached(
    `vetos:por-parlamentar:${parlamentarId}`,
    TTL.vetos,
    async () => {
      const rows = await db
        .select({
          vetoId: veto.id,
          vetoNumero: veto.numero,
          vetoAno: veto.ano,
          vetoEmenta: veto.ementa,
          dispositivoId: dispositivoVeto.id,
          dispositivoIdentificador: dispositivoVeto.identificador,
          situacao: dispositivoVeto.situacao,
          dataSessao: dispositivoVeto.dataSessao,
          voto: votoVeto.voto,
        })
        .from(votoVeto)
        .innerJoin(
          dispositivoVeto,
          eq(dispositivoVeto.id, votoVeto.dispositivoId),
        )
        .innerJoin(veto, eq(veto.id, dispositivoVeto.vetoId))
        .where(eq(votoVeto.parlamentarId, parlamentarId))
        .orderBy(desc(veto.dataPublicacao), dispositivoVeto.identificador)

      return rows.map((r) => ({
        vetoId: r.vetoId,
        vetoNumero: r.vetoNumero,
        vetoAno: r.vetoAno,
        vetoEmenta: r.vetoEmenta,
        dispositivoId: r.dispositivoId,
        dispositivoIdentificador: r.dispositivoIdentificador,
        situacao: r.situacao,
        dataSessao: r.dataSessao as string | null,
        voto: r.voto,
      }))
    },
  )
}

// Anos com vetos disponíveis no banco.
export async function getAnosComVetos(): Promise<number[]> {
  return cached('vetos:anos', TTL.vetos, async () => {
    const rows = await db
      .selectDistinct({ ano: veto.ano })
      .from(veto)
      .orderBy(desc(veto.ano))
    return rows.map((r) => r.ano)
  })
}

// Conta votos por posição para o KPI no perfil do senador.
export async function getVetosStatsParlamentar(
  parlamentarId: string,
): Promise<{ sim: number; nao: number; abstencao: number } | null> {
  return cached(
    `vetos:stats-parlamentar:${parlamentarId}`,
    TTL.vetos,
    async () => {
      const rows = await db
        .select({ voto: votoVeto.voto })
        .from(votoVeto)
        .where(eq(votoVeto.parlamentarId, parlamentarId))

      if (rows.length === 0) return null
      let sim = 0,
        nao = 0,
        abstencao = 0
      for (const r of rows) {
        if (r.voto === 'SIM') sim++
        else if (r.voto === 'NAO') nao++
        else abstencao++
      }
      return { sim, nao, abstencao }
    },
  )
}
