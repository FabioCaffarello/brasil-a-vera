import { asc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  frenteMembro,
  frenteParlamentar,
  parlamentar,
} from '@/shared/db/schema'

export interface FrenteListRow {
  id: string
  sourceId: string
  nome: string
  legislatura: number
  membrosCount: number
}

export interface FrenteDetalhe {
  id: string
  sourceId: string
  nome: string
  legislatura: number
  membros: {
    parlamentarId: string
    parlamentarNome: string
    parlamentarPartidoSigla: string | null
    parlamentarUf: string
    parlamentarUrlFoto: string | null
    titulo: string | null
  }[]
}

export async function listFrentes(
  legislatura?: number,
): Promise<FrenteListRow[]> {
  const legKey = legislatura ?? 'all'
  return cached(`frentes:list:${legKey}`, TTL.liderancas, async () => {
    const rows = await db
      .select({
        id: frenteParlamentar.id,
        sourceId: frenteParlamentar.sourceId,
        nome: frenteParlamentar.nome,
        legislatura: frenteParlamentar.legislatura,
      })
      .from(frenteParlamentar)
      .orderBy(asc(frenteParlamentar.nome))

    // Contar membros por frente em uma segunda query (mais simples que GROUP BY
    // com Drizzle quando o join não é direto em select único).
    if (rows.length === 0) return []

    const contagemRows = await db
      .select({ frenteId: frenteMembro.frenteId })
      .from(frenteMembro)

    const contagemMap = new Map<string, number>()
    for (const r of contagemRows) {
      contagemMap.set(r.frenteId, (contagemMap.get(r.frenteId) ?? 0) + 1)
    }

    return rows.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      nome: r.nome,
      legislatura: r.legislatura,
      membrosCount: contagemMap.get(r.id) ?? 0,
    }))
  })
}

export async function getFrenteById(id: string): Promise<FrenteDetalhe | null> {
  return cached(`frentes:byid:${id}`, TTL.liderancas, async () => {
    const frentes = await db
      .select({
        id: frenteParlamentar.id,
        sourceId: frenteParlamentar.sourceId,
        nome: frenteParlamentar.nome,
        legislatura: frenteParlamentar.legislatura,
      })
      .from(frenteParlamentar)
      .where(eq(frenteParlamentar.id, id))
      .limit(1)

    const frente = frentes[0]
    if (!frente) return null

    const membros = await db
      .select({
        parlamentarId: parlamentar.id,
        parlamentarNome: parlamentar.nome,
        parlamentarPartidoSigla: parlamentar.partidoSigla,
        parlamentarUf: parlamentar.uf,
        parlamentarUrlFoto: parlamentar.urlFoto,
        titulo: frenteMembro.titulo,
      })
      .from(frenteMembro)
      .innerJoin(parlamentar, eq(parlamentar.id, frenteMembro.parlamentarId))
      .where(eq(frenteMembro.frenteId, id))
      .orderBy(asc(parlamentar.nome))

    return {
      id: frente.id,
      sourceId: frente.sourceId,
      nome: frente.nome,
      legislatura: frente.legislatura,
      membros,
    }
  })
}

// Retorna mapa nome→id para linkagem de frentes no perfil do parlamentar.
export async function getFrentesNameToIdMap(): Promise<Map<string, string>> {
  return cached('frentes:name-to-id', TTL.liderancas, async () => {
    const rows = await db
      .select({ id: frenteParlamentar.id, nome: frenteParlamentar.nome })
      .from(frenteParlamentar)
    return new Map(rows.map((r) => [r.nome, r.id]))
  })
}
