import { asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { InvalidArgumentError } from '@/core/shared/domain/errors/invalid-argument.error'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import type { SearchParams } from '@/core/shared/domain/repository/search-params'
import { SearchResult } from '@/core/shared/domain/repository/search-result'
import { Parlamentar } from '../../../domain/parlamentar.aggregate'
import type {
  IParlamentarRepository,
  ParlamentarFilter,
} from '../../../domain/parlamentar.repository'
import type { ParlamentarId } from '../../../domain/value-objects/parlamentar-id.vo'
import {
  filiacoesPartidarias,
  frentesParlamentares,
  mandatos,
  membrosComissao,
  parlamentares,
} from './parlamentar.schema'
import { toDomain, toPersistence } from './parlamentar-mapper'

type DbSchema = Record<string, unknown>

export class ParlamentarDrizzleRepository implements IParlamentarRepository {
  sortableFields = ['nome', 'uf', 'createdAt']

  constructor(private readonly db: PostgresJsDatabase<DbSchema>) {}

  async insert(entity: Parlamentar): Promise<void> {
    const data = toPersistence(entity)
    await this.db.transaction(async (tx) => {
      await tx.insert(parlamentares).values(data.parlamentar)
      if (data.mandatos.length) await tx.insert(mandatos).values(data.mandatos)
      if (data.filiacoes.length)
        await tx.insert(filiacoesPartidarias).values(data.filiacoes)
      if (data.comissoes.length)
        await tx.insert(membrosComissao).values(data.comissoes)
      if (data.frentes.length)
        await tx.insert(frentesParlamentares).values(data.frentes)
    })
  }

  async bulkInsert(entities: Parlamentar[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const entity of entities) {
        const data = toPersistence(entity)
        await tx.insert(parlamentares).values(data.parlamentar)
        if (data.mandatos.length)
          await tx.insert(mandatos).values(data.mandatos)
        if (data.filiacoes.length)
          await tx.insert(filiacoesPartidarias).values(data.filiacoes)
        if (data.comissoes.length)
          await tx.insert(membrosComissao).values(data.comissoes)
        if (data.frentes.length)
          await tx.insert(frentesParlamentares).values(data.frentes)
      }
    })
  }

  async update(entity: Parlamentar): Promise<void> {
    const data = toPersistence(entity)
    await this.db.transaction(async (tx) => {
      await tx
        .update(parlamentares)
        .set(data.parlamentar)
        .where(eq(parlamentares.id, entity.parlamentarId.id))

      // Replace child rows: delete + re-insert
      await tx
        .delete(mandatos)
        .where(eq(mandatos.parlamentarId, entity.parlamentarId.id))
      await tx
        .delete(filiacoesPartidarias)
        .where(eq(filiacoesPartidarias.parlamentarId, entity.parlamentarId.id))
      await tx
        .delete(membrosComissao)
        .where(eq(membrosComissao.parlamentarId, entity.parlamentarId.id))
      await tx
        .delete(frentesParlamentares)
        .where(eq(frentesParlamentares.parlamentarId, entity.parlamentarId.id))

      if (data.mandatos.length) await tx.insert(mandatos).values(data.mandatos)
      if (data.filiacoes.length)
        await tx.insert(filiacoesPartidarias).values(data.filiacoes)
      if (data.comissoes.length)
        await tx.insert(membrosComissao).values(data.comissoes)
      if (data.frentes.length)
        await tx.insert(frentesParlamentares).values(data.frentes)
    })
  }

  async delete(entityId: ParlamentarId): Promise<void> {
    const result = await this.db
      .delete(parlamentares)
      .where(eq(parlamentares.id, entityId.id))
      .returning({ id: parlamentares.id })

    if (!result.length) {
      throw new NotFoundError(entityId, this.getEntity())
    }
  }

  async findById(entityId: ParlamentarId): Promise<Parlamentar | null> {
    return this.findOneWhere(eq(parlamentares.id, entityId.id))
  }

  async findByIdExterno(idExterno: string): Promise<Parlamentar | null> {
    return this.findOneWhere(eq(parlamentares.idExterno, idExterno))
  }

  async findAll(): Promise<Parlamentar[]> {
    const rows = await this.db.select().from(parlamentares)
    return this.hydrateMany(rows)
  }

  async findByIds(ids: ParlamentarId[]): Promise<Parlamentar[]> {
    if (!ids.length) return []
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select()
      .from(parlamentares)
      .where(inArray(parlamentares.id, idValues))
    return this.hydrateMany(rows)
  }

  async existsById(
    ids: ParlamentarId[],
  ): Promise<{ exists: ParlamentarId[]; notExists: ParlamentarId[] }> {
    if (!ids.length) {
      throw new InvalidArgumentError('ids must be a non-empty array')
    }
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select({ id: parlamentares.id })
      .from(parlamentares)
      .where(inArray(parlamentares.id, idValues))

    const foundIds = new Set(rows.map((r) => r.id))
    const exists: ParlamentarId[] = []
    const notExists: ParlamentarId[] = []
    for (const id of ids) {
      if (foundIds.has(id.id)) {
        exists.push(id)
      } else {
        notExists.push(id)
      }
    }
    return { exists, notExists }
  }

  async search(
    props: SearchParams<ParlamentarFilter>,
  ): Promise<SearchResult<Parlamentar>> {
    const whereClause = props.filter
      ? or(
          ilike(parlamentares.nome, `%${props.filter}%`),
          ilike(parlamentares.partidoSigla, `%${props.filter}%`),
          ilike(parlamentares.uf, `%${props.filter}%`),
        )
      : undefined

    // Count total matching rows
    const [countResult] = await this.db
      .select({ total: count() })
      .from(parlamentares)
      .where(whereClause)

    const total = countResult?.total ?? 0

    if (total === 0) {
      return new SearchResult({
        items: [],
        total: 0,
        currentPage: props.page,
        perPage: props.perPage,
      })
    }

    // Build order clause
    const orderColumn = this.resolveOrderColumn(props.sort)
    const orderDir = props.sortDir === 'desc' ? desc : asc
    const orderClause = orderColumn ? orderDir(orderColumn) : undefined

    // Paginated query
    const offset = (props.page - 1) * props.perPage
    let query = this.db
      .select()
      .from(parlamentares)
      .where(whereClause)
      .limit(props.perPage)
      .offset(offset)

    if (orderClause) {
      query = query.orderBy(orderClause)
    }

    const rows = await query

    // Hydrate with child tables (batch, no N+1)
    const items = await this.hydrateMany(rows)

    return new SearchResult({
      items,
      total,
      currentPage: props.page,
      perPage: props.perPage,
    })
  }

  getEntity(): new (...args: unknown[]) => Parlamentar {
    return Parlamentar as unknown as new (
      ...args: unknown[]
    ) => Parlamentar
  }

  // --- Private helpers ---

  private async findOneWhere(
    condition: ReturnType<typeof eq>,
  ): Promise<Parlamentar | null> {
    const rows = await this.db
      .select()
      .from(parlamentares)
      .where(condition)
      .limit(1)

    if (!rows.length) return null

    const row = rows[0]
    const [mandatoRows, filiacaoRows, comissaoRows, frenteRows] =
      await this.fetchChildRows(row.id)

    return toDomain(row, mandatoRows, filiacaoRows, comissaoRows, frenteRows)
  }

  private async hydrateMany(
    rows: (typeof parlamentares.$inferSelect)[],
  ): Promise<Parlamentar[]> {
    if (!rows.length) return []

    const ids = rows.map((r) => r.id)

    const [allMandatos, allFiliacoes, allComissoes, allFrentes] =
      await Promise.all([
        this.db
          .select()
          .from(mandatos)
          .where(inArray(mandatos.parlamentarId, ids)),
        this.db
          .select()
          .from(filiacoesPartidarias)
          .where(inArray(filiacoesPartidarias.parlamentarId, ids)),
        this.db
          .select()
          .from(membrosComissao)
          .where(inArray(membrosComissao.parlamentarId, ids)),
        this.db
          .select()
          .from(frentesParlamentares)
          .where(inArray(frentesParlamentares.parlamentarId, ids)),
      ])

    return rows.map((row) =>
      toDomain(
        row,
        allMandatos.filter((m) => m.parlamentarId === row.id),
        allFiliacoes.filter((f) => f.parlamentarId === row.id),
        allComissoes.filter((c) => c.parlamentarId === row.id),
        allFrentes.filter((f) => f.parlamentarId === row.id),
      ),
    )
  }

  private async fetchChildRows(parlamentarId: string) {
    return Promise.all([
      this.db
        .select()
        .from(mandatos)
        .where(eq(mandatos.parlamentarId, parlamentarId)),
      this.db
        .select()
        .from(filiacoesPartidarias)
        .where(eq(filiacoesPartidarias.parlamentarId, parlamentarId)),
      this.db
        .select()
        .from(membrosComissao)
        .where(eq(membrosComissao.parlamentarId, parlamentarId)),
      this.db
        .select()
        .from(frentesParlamentares)
        .where(eq(frentesParlamentares.parlamentarId, parlamentarId)),
    ])
  }

  private resolveOrderColumn(sort: string | null) {
    if (!sort || !this.sortableFields.includes(sort)) return null
    const columnMap: Record<
      string,
      (typeof parlamentares)[keyof typeof parlamentares]
    > = {
      nome: parlamentares.nome,
      uf: parlamentares.uf,
      createdAt: parlamentares.createdAt,
    }
    return columnMap[sort] ?? null
  }
}
