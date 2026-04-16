import { asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { InvalidArgumentError } from '@/core/shared/domain/errors/invalid-argument.error'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import type { SearchParams } from '@/core/shared/domain/repository/search-params'
import { SearchResult } from '@/core/shared/domain/repository/search-result'
import type { VotacaoId } from '../../../domain/value-objects/votacao-id.vo'
import { Votacao } from '../../../domain/votacao.aggregate'
import type {
  IVotacaoRepository,
  VotacaoFilter,
} from '../../../domain/votacao.repository'
import { orientacoesBancada, votacoes, votosNominais } from './votacao.schema'
import { votacaoToDomain, votacaoToPersistence } from './votacao-mapper'

type DbSchema = Record<string, unknown>

export class VotacaoDrizzleRepository implements IVotacaoRepository {
  sortableFields = ['descricao', 'dataHora', 'orgao', 'createdAt']

  constructor(private readonly db: PostgresJsDatabase<DbSchema>) {}

  async insert(entity: Votacao): Promise<void> {
    const data = votacaoToPersistence(entity)
    await this.db.transaction(async (tx) => {
      await tx.insert(votacoes).values(data.votacao)
      if (data.votos.length) await tx.insert(votosNominais).values(data.votos)
      if (data.orientacoes.length)
        await tx.insert(orientacoesBancada).values(data.orientacoes)
    })
  }

  async bulkInsert(entities: Votacao[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const entity of entities) {
        const data = votacaoToPersistence(entity)
        await tx.insert(votacoes).values(data.votacao)
        if (data.votos.length) await tx.insert(votosNominais).values(data.votos)
        if (data.orientacoes.length)
          await tx.insert(orientacoesBancada).values(data.orientacoes)
      }
    })
  }

  async update(entity: Votacao): Promise<void> {
    const data = votacaoToPersistence(entity)
    await this.db.transaction(async (tx) => {
      await tx
        .update(votacoes)
        .set(data.votacao)
        .where(eq(votacoes.id, entity.votacaoId.id))
      await tx
        .delete(votosNominais)
        .where(eq(votosNominais.votacaoId, entity.votacaoId.id))
      await tx
        .delete(orientacoesBancada)
        .where(eq(orientacoesBancada.votacaoId, entity.votacaoId.id))
      if (data.votos.length) await tx.insert(votosNominais).values(data.votos)
      if (data.orientacoes.length)
        await tx.insert(orientacoesBancada).values(data.orientacoes)
    })
  }

  async delete(entityId: VotacaoId): Promise<void> {
    const result = await this.db
      .delete(votacoes)
      .where(eq(votacoes.id, entityId.id))
      .returning({ id: votacoes.id })
    if (!result.length) throw new NotFoundError(entityId, this.getEntity())
  }

  async findById(entityId: VotacaoId): Promise<Votacao | null> {
    return this.findOneWhere(eq(votacoes.id, entityId.id))
  }

  async findByIdExterno(idExterno: string): Promise<Votacao | null> {
    return this.findOneWhere(eq(votacoes.idExterno, idExterno))
  }

  async findByProposicaoIdExterno(
    proposicaoIdExterno: string,
  ): Promise<Votacao[]> {
    const rows = await this.db
      .select()
      .from(votacoes)
      .where(eq(votacoes.proposicaoIdExterno, proposicaoIdExterno))
    return this.hydrateMany(rows)
  }

  async findAll(): Promise<Votacao[]> {
    const rows = await this.db.select().from(votacoes)
    return this.hydrateMany(rows)
  }

  async findByIds(ids: VotacaoId[]): Promise<Votacao[]> {
    if (!ids.length) return []
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select()
      .from(votacoes)
      .where(inArray(votacoes.id, idValues))
    return this.hydrateMany(rows)
  }

  async existsById(
    ids: VotacaoId[],
  ): Promise<{ exists: VotacaoId[]; notExists: VotacaoId[] }> {
    if (!ids.length)
      throw new InvalidArgumentError('ids must be a non-empty array')
    const idValues = ids.map((id) => id.id)
    const rows = await this.db
      .select({ id: votacoes.id })
      .from(votacoes)
      .where(inArray(votacoes.id, idValues))
    const foundIds = new Set(rows.map((r) => r.id))
    const exists: VotacaoId[] = []
    const notExists: VotacaoId[] = []
    for (const id of ids) {
      if (foundIds.has(id.id)) exists.push(id)
      else notExists.push(id)
    }
    return { exists, notExists }
  }

  async search(
    props: SearchParams<VotacaoFilter>,
  ): Promise<SearchResult<Votacao>> {
    const whereClause = props.filter
      ? or(
          ilike(votacoes.descricao, `%${props.filter}%`),
          ilike(votacoes.orgao, `%${props.filter}%`),
        )
      : undefined

    const [countResult] = await this.db
      .select({ total: count() })
      .from(votacoes)
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
      .from(votacoes)
      .where(whereClause)
      .limit(props.perPage)
      .offset(offset)
      .$dynamic()
    if (orderColumn) query = query.orderBy(orderDir(orderColumn))

    const rows = await query
    const items = await this.hydrateMany(rows)

    return new SearchResult({
      items,
      total,
      currentPage: props.page,
      perPage: props.perPage,
    })
  }

  getEntity(): new (...args: unknown[]) => Votacao {
    return Votacao as unknown as new (
      ...args: unknown[]
    ) => Votacao
  }

  private async findOneWhere(
    condition: ReturnType<typeof eq>,
  ): Promise<Votacao | null> {
    const rows = await this.db.select().from(votacoes).where(condition).limit(1)
    if (!rows.length) return null
    const row = rows[0]
    const [votoRows, orientacaoRows] = await this.fetchChildRows(row.id)
    return votacaoToDomain(row, votoRows, orientacaoRows)
  }

  private async hydrateMany(
    rows: (typeof votacoes.$inferSelect)[],
  ): Promise<Votacao[]> {
    if (!rows.length) return []
    const ids = rows.map((r) => r.id)
    const [allVotos, allOrientacoes] = await Promise.all([
      this.db
        .select()
        .from(votosNominais)
        .where(inArray(votosNominais.votacaoId, ids)),
      this.db
        .select()
        .from(orientacoesBancada)
        .where(inArray(orientacoesBancada.votacaoId, ids)),
    ])
    return rows.map((row) =>
      votacaoToDomain(
        row,
        allVotos.filter((v) => v.votacaoId === row.id),
        allOrientacoes.filter((o) => o.votacaoId === row.id),
      ),
    )
  }

  private async fetchChildRows(votacaoId: string) {
    return Promise.all([
      this.db
        .select()
        .from(votosNominais)
        .where(eq(votosNominais.votacaoId, votacaoId)),
      this.db
        .select()
        .from(orientacoesBancada)
        .where(eq(orientacoesBancada.votacaoId, votacaoId)),
    ])
  }

  private resolveOrderColumn(sort: string | null): AnyPgColumn | null {
    if (!sort || !this.sortableFields.includes(sort)) return null
    const columnMap: Record<string, AnyPgColumn> = {
      descricao: votacoes.descricao,
      dataHora: votacoes.dataHora,
      orgao: votacoes.orgao,
      createdAt: votacoes.createdAt,
    }
    return columnMap[sort] ?? null
  }
}
