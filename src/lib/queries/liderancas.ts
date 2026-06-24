import { and, eq, isNull } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  frenteMembro,
  frenteParlamentar,
  liderancaCargo,
} from '@/shared/db/schema'

// Queries de lideranças e frentes para o perfil do parlamentar (ADR-056).
// Cache 24h (TTL.liderancas) — ingestão mensal, dado quase-estático.

export interface LiderancaAtiva {
  tipo: string
  entidade: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
}

export interface FrenteParlamentarItem {
  nome: string
  titulo: string | null
}

// Retorna os cargos de liderança vigentes (data_fim IS NULL).
export async function getLiderancasByParlamentar(
  parlamentarId: string,
): Promise<LiderancaAtiva[]> {
  return cached(
    `parlamentar:liderancas:${parlamentarId}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          tipo: liderancaCargo.tipo,
          entidade: liderancaCargo.entidade,
          casa: liderancaCargo.casa,
          legislatura: liderancaCargo.legislatura,
        })
        .from(liderancaCargo)
        .where(
          and(
            eq(liderancaCargo.parlamentarId, parlamentarId),
            isNull(liderancaCargo.dataFim), // NULL = vigente na legislatura corrente
          ),
        )
        .orderBy(liderancaCargo.tipo, liderancaCargo.entidade)

      return rows.map((r) => ({
        tipo: r.tipo,
        entidade: r.entidade,
        casa: r.casa,
        legislatura: r.legislatura,
      }))
    },
  )
}

// Retorna as frentes parlamentares em que o parlamentar participa.
export async function getFrentesByParlamentar(
  parlamentarId: string,
): Promise<FrenteParlamentarItem[]> {
  return cached(
    `parlamentar:frentes:${parlamentarId}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          nome: frenteParlamentar.nome,
          titulo: frenteMembro.titulo,
        })
        .from(frenteMembro)
        .innerJoin(
          frenteParlamentar,
          eq(frenteParlamentar.id, frenteMembro.frenteId),
        )
        .where(eq(frenteMembro.parlamentarId, parlamentarId))
        .orderBy(frenteParlamentar.nome)

      return rows.map((r) => ({
        nome: r.nome,
        titulo: r.titulo,
      }))
    },
  )
}
