import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  frenteMembro,
  frenteParlamentar,
  liderancaCargo,
  parlamentar,
} from '@/shared/db/schema'

const TIPOS_MESA = [
  'PRESIDENTE_MESA',
  'VICE_PRESIDENTE_MESA',
  'SECRETARIO_MESA',
  'SUPLENTE_MESA',
] as const

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

export interface LiderancaHistorica {
  tipo: string
  entidade: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  dataInicio: string | null
  dataFim: string | null
}

// Retorna cargos de liderança encerrados (data_fim IS NOT NULL), decrescente.
export async function getLiderancasHistoricas(
  parlamentarId: string,
): Promise<LiderancaHistorica[]> {
  return cached(
    `parlamentar:liderancas-historicas:${parlamentarId}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          tipo: liderancaCargo.tipo,
          entidade: liderancaCargo.entidade,
          casa: liderancaCargo.casa,
          legislatura: liderancaCargo.legislatura,
          dataInicio: liderancaCargo.dataInicio,
          dataFim: liderancaCargo.dataFim,
        })
        .from(liderancaCargo)
        .where(
          and(
            eq(liderancaCargo.parlamentarId, parlamentarId),
            isNotNull(liderancaCargo.dataFim),
          ),
        )
        .orderBy(desc(liderancaCargo.dataFim))
      return rows.map((r) => ({
        tipo: r.tipo,
        entidade: r.entidade,
        casa: r.casa as 'CAMARA' | 'SENADO',
        legislatura: r.legislatura,
        dataInicio: r.dataInicio,
        dataFim: r.dataFim,
      }))
    },
  )
}

export interface MesaDiretoraEntry {
  tipo: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  parlamentarId: string
  parlamentarNome: string
  parlamentarPartidoSigla: string | null
  parlamentarUf: string
  parlamentarUrlFoto: string | null
}

// Mesa Diretora da Câmara e do Senado (cargos vigentes, data_fim IS NULL).
export async function getMesaDiretora(): Promise<MesaDiretoraEntry[]> {
  return cached('mesa-diretora:vigente', TTL.liderancas, async () => {
    const rows = await db
      .select({
        tipo: liderancaCargo.tipo,
        casa: liderancaCargo.casa,
        legislatura: liderancaCargo.legislatura,
        parlamentarId: parlamentar.id,
        parlamentarNome: parlamentar.nome,
        parlamentarPartidoSigla: parlamentar.partidoSigla,
        parlamentarUf: parlamentar.uf,
        parlamentarUrlFoto: parlamentar.urlFoto,
      })
      .from(liderancaCargo)
      .innerJoin(parlamentar, eq(parlamentar.id, liderancaCargo.parlamentarId))
      .where(
        and(
          inArray(liderancaCargo.tipo, [...TIPOS_MESA]),
          isNull(liderancaCargo.dataFim),
        ),
      )
      .orderBy(liderancaCargo.casa, liderancaCargo.tipo)
    return rows.map((r) => ({
      tipo: r.tipo,
      casa: r.casa as 'CAMARA' | 'SENADO',
      legislatura: r.legislatura,
      parlamentarId: r.parlamentarId,
      parlamentarNome: r.parlamentarNome,
      parlamentarPartidoSigla: r.parlamentarPartidoSigla,
      parlamentarUf: r.parlamentarUf,
      parlamentarUrlFoto: r.parlamentarUrlFoto,
    }))
  })
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
