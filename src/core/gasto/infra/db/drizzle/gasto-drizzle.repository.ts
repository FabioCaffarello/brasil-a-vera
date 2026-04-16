import { asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { InvalidArgumentError } from '@/core/shared/domain/errors/invalid-argument.error'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import type { SearchParams } from '@/core/shared/domain/repository/search-params'
import { SearchResult } from '@/core/shared/domain/repository/search-result'
import { Gasto } from '../../../domain/gasto.aggregate'
import type {
  GastoFilter,
  IGastoRepository,
} from '../../../domain/gasto.repository'
import type { GastoId } from '../../../domain/value-objects/gasto-id.vo'
import { gastos } from './gasto.schema'
import { gastoToDomain, gastoToPersistence } from './gasto-mapper'

type DbSchema = Record<string, unknown>

export class GastoDrizzleRepository implements IGastoRepository {
  sortableFields = ['ano', 'mes', 'valorDocumento', 'createdAt']

  constructor(private readonly db: PostgresJsDatabase<DbSchema>) {}

  async insert(entity: Gasto): Promise<void> {
    const data = gastoToPersistence(entity)
    await this.db.insert(gastos).values(data)
  }

  async bulkInsert(entities: Gasto[]): Promise<void> {
    if (!entities.length) return
    const data = entities.map(gastoToPersistence)
    await this.db.insert(gastos).values(data)
  }

  async update(entity: Gasto): Promise<void> {
    const data = gastoToPersistence(entity)
    await this.db
      .update(gastos)
      .set(data)
      .where(eq(gastos.id, entity.gastoId.id))
  }

  async delete(entityId: GastoId): Promise<void> {
    const result = await this.db
      .delete(gastos)
      .where(eq(gastos.id, entityId.id))
      .returning({ id: gastos.id })
    if (!result.length) throw new NotFoundError(entityId, this.getEntity())
  }

  async findById(entityId: GastoId): Promise<Gasto | null> {
    const rows = await this.db
      .select()
      .from(gastos)
      .where(eq(gastos.id, entityId.id))
      .limit(1)
    if (!rows.length) return null
    return gastoToDomain(rows[0])
  }

  async findByCodDocumento(codDocumento: number): Promise<Gasto | null> {
    const rows = await this.db
      .select()
      .from(gastos)
      .where(eq(gastos.codDocumento, codDocumento))
      .limit(1)
    if (!rows.length) return null
    return gastoToDomain(rows[0])
  }

  async findByParlamentarIdExterno(
    parlamentarIdExterno: string,
  ): Promise<Gasto[]> {
    const rows = await this.db
      .select()
      .from(gastos)
      .where(eq(gastos.parlamentarIdExterno, parlamentarIdExterno))
    return rows.map(gastoToDomain)
  }

  async findAll(): Promise<Gasto[]> {
    const rows = await this.db.select().from(gastos)
    return rows.map(gastoToDomain)
  }

  async findByIds(ids: GastoId[]): Promise<Gasto[]> {
    if (!ids.length) return []
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select()
      .from(gastos)
      .where(inArray(gastos.id, idValues))
    return rows.map(gastoToDomain)
  }

  async existsById(
    ids: GastoId[],
  ): Promise<{ exists: GastoId[]; notExists: GastoId[] }> {
    if (!ids.length)
      throw new InvalidArgumentError('ids must be a non-empty array')
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select({ id: gastos.id })
      .from(gastos)
      .where(inArray(gastos.id, idValues))
    const foundIds = new Set(rows.map((r) => r.id))
    const exists: GastoId[] = []
    const notExists: GastoId[] = []
    for (const id of ids) {
      if (foundIds.has(id.id)) exists.push(id)
      else notExists.push(id)
    }
    return { exists, notExists }
  }

  async search(props: SearchParams<GastoFilter>): Promise<SearchResult<Gasto>> {
    const whereClause = props.filter
      ? or(
          ilike(gastos.tipoDespesa, `%${props.filter}%`),
          ilike(gastos.nomeFornecedor, `%${props.filter}%`),
        )
      : undefined

    const [countResult] = await this.db
      .select({ total: count() })
      .from(gastos)
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

    let query = this.db
      .select()
      .from(gastos)
      .where(whereClause)
      .limit(props.perPage)
      .offset(offset)
    if (orderColumn) query = query.orderBy(orderDir(orderColumn))

    const rows = await query
    const items = rows.map(gastoToDomain)

    return new SearchResult({
      items,
      total,
      currentPage: props.page,
      perPage: props.perPage,
    })
  }

  getEntity(): new (...args: unknown[]) => Gasto {
    return Gasto as unknown as new (
      ...args: unknown[]
    ) => Gasto
  }

  private resolveOrderColumn(sort: string | null) {
    if (!sort || !this.sortableFields.includes(sort)) return null
    const columnMap: Record<string, (typeof gastos)[keyof typeof gastos]> = {
      ano: gastos.ano,
      mes: gastos.mes,
      valorDocumento: gastos.valorDocumento,
      createdAt: gastos.createdAt,
    }
    return columnMap[sort] ?? null
  }
}
