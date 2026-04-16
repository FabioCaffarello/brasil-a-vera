import { asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { InvalidArgumentError } from '@/core/shared/domain/errors/invalid-argument.error'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import type { SearchParams } from '@/core/shared/domain/repository/search-params'
import { SearchResult } from '@/core/shared/domain/repository/search-result'
import { Proposicao } from '../../../domain/proposicao.aggregate'
import type {
  IProposicaoRepository,
  ProposicaoFilter,
} from '../../../domain/proposicao.repository'
import type { ProposicaoId } from '../../../domain/value-objects/proposicao-id.vo'
import { proposicoes } from './proposicao.schema'
import {
  proposicaoToDomain,
  proposicaoToPersistence,
} from './proposicao-mapper'

type DbSchema = Record<string, unknown>

export class ProposicaoDrizzleRepository implements IProposicaoRepository {
  sortableFields = ['ano', 'numero', 'dataApresentacao', 'createdAt']

  constructor(private readonly db: PostgresJsDatabase<DbSchema>) {}

  async insert(entity: Proposicao): Promise<void> {
    const data = proposicaoToPersistence(entity)
    await this.db.insert(proposicoes).values(data)
  }

  async bulkInsert(entities: Proposicao[]): Promise<void> {
    if (!entities.length) return
    const data = entities.map(proposicaoToPersistence)
    await this.db.insert(proposicoes).values(data)
  }

  async update(entity: Proposicao): Promise<void> {
    const data = proposicaoToPersistence(entity)
    await this.db
      .update(proposicoes)
      .set(data)
      .where(eq(proposicoes.id, entity.proposicaoId.id))
  }

  async delete(entityId: ProposicaoId): Promise<void> {
    const result = await this.db
      .delete(proposicoes)
      .where(eq(proposicoes.id, entityId.id))
      .returning({ id: proposicoes.id })
    if (!result.length) throw new NotFoundError(entityId, this.getEntity())
  }

  async findById(entityId: ProposicaoId): Promise<Proposicao | null> {
    const rows = await this.db
      .select()
      .from(proposicoes)
      .where(eq(proposicoes.id, entityId.id))
      .limit(1)
    if (!rows.length) return null
    return proposicaoToDomain(rows[0])
  }

  async findByIdExterno(idExterno: string): Promise<Proposicao | null> {
    const rows = await this.db
      .select()
      .from(proposicoes)
      .where(eq(proposicoes.idExterno, idExterno))
      .limit(1)
    if (!rows.length) return null
    return proposicaoToDomain(rows[0])
  }

  async findAll(): Promise<Proposicao[]> {
    const rows = await this.db.select().from(proposicoes)
    return rows.map(proposicaoToDomain)
  }

  async findByIds(ids: ProposicaoId[]): Promise<Proposicao[]> {
    if (!ids.length) return []
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select()
      .from(proposicoes)
      .where(inArray(proposicoes.id, idValues))
    return rows.map(proposicaoToDomain)
  }

  async existsById(
    ids: ProposicaoId[],
  ): Promise<{ exists: ProposicaoId[]; notExists: ProposicaoId[] }> {
    if (!ids.length)
      throw new InvalidArgumentError('ids must be a non-empty array')
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select({ id: proposicoes.id })
      .from(proposicoes)
      .where(inArray(proposicoes.id, idValues))
    const foundIds = new Set(rows.map((r) => r.id))
    const exists: ProposicaoId[] = []
    const notExists: ProposicaoId[] = []
    for (const id of ids) {
      if (foundIds.has(id.id)) exists.push(id)
      else notExists.push(id)
    }
    return { exists, notExists }
  }

  async search(
    props: SearchParams<ProposicaoFilter>,
  ): Promise<SearchResult<Proposicao>> {
    const whereClause = props.filter
      ? or(
          ilike(proposicoes.ementa, `%${props.filter}%`),
          ilike(proposicoes.idExterno, `%${props.filter}%`),
          ilike(proposicoes.tipo, `%${props.filter}%`),
        )
      : undefined

    const [countResult] = await this.db
      .select({ total: count() })
      .from(proposicoes)
      .where(whereClause)

    const total = countResult?.total ?? 0
    if (total === 0)
      return new SearchResult({
        items: [],
        total: 0,
        currentPage: props.page,
        perPage: props.perPage,
      })

    const orderColumn = this.resolveOrderColumn(props.sort)
    const orderDir = props.sortDir === 'desc' ? desc : asc
    const offset = (props.page - 1) * props.perPage

    // .$dynamic() permite re-atribuir após chamar orderBy condicionalmente
    // sem perder métodos do query builder na inferência de tipo.
    let query = this.db
      .select()
      .from(proposicoes)
      .where(whereClause)
      .limit(props.perPage)
      .offset(offset)
      .$dynamic()
    if (orderColumn) query = query.orderBy(orderDir(orderColumn))

    const rows = await query
    const items = rows.map(proposicaoToDomain)

    return new SearchResult({
      items,
      total,
      currentPage: props.page,
      perPage: props.perPage,
    })
  }

  getEntity(): new (...args: unknown[]) => Proposicao {
    return Proposicao as unknown as new (
      ...args: unknown[]
    ) => Proposicao
  }

  private resolveOrderColumn(sort: string | null): AnyPgColumn | null {
    if (!sort || !this.sortableFields.includes(sort)) return null
    const columnMap: Record<string, AnyPgColumn> = {
      ano: proposicoes.ano,
      numero: proposicoes.numero,
      dataApresentacao: proposicoes.dataApresentacao,
      createdAt: proposicoes.createdAt,
    }
    return columnMap[sort] ?? null
  }
}
