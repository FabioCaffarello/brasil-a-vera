import { eq, sql } from 'drizzle-orm'

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
      // lower(unaccent(...)): nomes vêm em caixa alta e com acento da fonte;
      // byte-order (collation C) desordenava a lista. Migration 0040.
      .orderBy(sql`lower(unaccent(${frenteParlamentar.nome}))`)

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
      .orderBy(sql`lower(unaccent(${parlamentar.nome}))`)

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
//
// ⚠️ O valor do `cached()` faz roundtrip por JSON no edge cache do Workers —
// `Map` serializa como `{}` e, no cache HIT, o consumidor explodia com
// "get is not a function", truncando o stream RSC de TODO perfil (bug latente
// do sprint 26, mascarado pelo deploy sempre-vermelho; diagnosticado em
// 2026-07-15 via wrangler tail). Em dev/CI não há `caches.default`, então o
// loader roda direto e o bug nunca reproduz localmente. O loader agora
// retorna entries JSON-safe e o Map é reconstruído FORA do cache. Chave com
// sufixo :v2 para não ler o `{}` corrompido já gravado.
export async function getFrentesNameToIdMap(): Promise<Map<string, string>> {
  const entries = await cached<[string, string][]>(
    'frentes:name-to-id:v2',
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({ id: frenteParlamentar.id, nome: frenteParlamentar.nome })
        .from(frenteParlamentar)
      return rows.map((r) => [r.nome, r.id])
    },
  )
  return new Map(entries)
}
