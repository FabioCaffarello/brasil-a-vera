import { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import type { TrustLevel } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { Uuid } from '@/core/shared/domain/value-objects/uuid.vo'
import { FiliacaoPartidaria } from '../../../domain/filiacao-partidaria.entity'
import { FrenteParlamentar } from '../../../domain/frente-parlamentar.entity'
import { Mandato } from '../../../domain/mandato.entity'
import { MembroComissao } from '../../../domain/membro-comissao.entity'
import { Parlamentar } from '../../../domain/parlamentar.aggregate'
import type { Casa } from '../../../domain/value-objects/casa.vo'
import { Legislatura } from '../../../domain/value-objects/legislatura.vo'
import { ParlamentarId } from '../../../domain/value-objects/parlamentar-id.vo'
import { Partido } from '../../../domain/value-objects/partido.vo'
import type { SituacaoMandato } from '../../../domain/value-objects/situacao-mandato.vo'
import type { TipoParticipacao } from '../../../domain/value-objects/tipo-participacao.vo'
import type {
  filiacoesPartidarias,
  frentesParlamentares,
  mandatos,
  membrosComissao,
  parlamentares,
} from './parlamentar.schema'

export type ParlamentarRow = typeof parlamentares.$inferSelect
export type MandatoRow = typeof mandatos.$inferSelect
export type FiliacaoRow = typeof filiacoesPartidarias.$inferSelect
export type ComissaoRow = typeof membrosComissao.$inferSelect
export type FrenteRow = typeof frentesParlamentares.$inferSelect

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function toPersistence(entity: Parlamentar) {
  return {
    parlamentar: {
      id: entity.parlamentarId.id,
      idExterno: entity.idExterno,
      nome: entity.nome,
      nomeCivil: entity.nomeCivil,
      cpf: entity.cpf,
      uf: entity.uf,
      partidoSigla: entity.partidoAtual.sigla,
      partidoNome: entity.partidoAtual.nome,
      urlFoto: entity.urlFoto,
      casa: entity.casa,
      trustLevel: entity.trust.trustLevel,
      sourceUrl: entity.trust.sourceUrl ?? '',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    },
    mandatos: entity.mandatos.map((m) => ({
      id: m.mandatoId.id,
      parlamentarId: entity.parlamentarId.id,
      legislaturaNumero: m.legislatura.numero,
      periodoInicio: toDateStr(m.periodo.start),
      periodoFim: m.periodo.end ? toDateStr(m.periodo.end) : null,
      situacao: m.situacao,
    })),
    filiacoes: entity.filiacoes.map((f) => ({
      parlamentarId: entity.parlamentarId.id,
      partidoSigla: f.partido.sigla,
      partidoNome: f.partido.nome,
      periodoInicio: toDateStr(f.periodo.start),
      periodoFim: f.periodo.end ? toDateStr(f.periodo.end) : null,
    })),
    comissoes: entity.comissoes.map((c) => ({
      parlamentarId: entity.parlamentarId.id,
      comissaoId: c.comissaoId,
      nomeComissao: c.nomeComissao,
      tipo: c.tipo,
      periodoInicio: toDateStr(c.periodo.start),
      periodoFim: c.periodo.end ? toDateStr(c.periodo.end) : null,
    })),
    frentes: entity.frentes.map((f) => ({
      parlamentarId: entity.parlamentarId.id,
      frenteId: f.frenteId,
      titulo: f.titulo,
      tipo: f.tipo,
    })),
  }
}

export function toDomain(
  row: ParlamentarRow,
  mandatoRows: MandatoRow[],
  filiacaoRows: FiliacaoRow[],
  comissaoRows: ComissaoRow[],
  frenteRows: FrenteRow[],
): Parlamentar {
  const trustLevel = row.trustLevel as TrustLevel
  const trust = new TrustMetadata(trustLevel, row.sourceUrl)

  return new Parlamentar({
    parlamentarId: new ParlamentarId(row.id),
    idExterno: row.idExterno,
    nome: row.nome,
    nomeCivil: row.nomeCivil ?? null,
    cpf: row.cpf ?? null,
    uf: row.uf,
    partidoAtual: new Partido(row.partidoSigla, row.partidoNome),
    urlFoto: row.urlFoto ?? null,
    casa: row.casa as Casa,
    trust,
    mandatos: mandatoRows.map(
      (m) =>
        new Mandato({
          mandatoId: new Uuid(m.id),
          legislatura: new Legislatura(
            m.legislaturaNumero,
            new DateRange(
              parseDate(m.periodoInicio),
              m.periodoFim ? parseDate(m.periodoFim) : null,
            ),
          ),
          periodo: new DateRange(
            parseDate(m.periodoInicio),
            m.periodoFim ? parseDate(m.periodoFim) : null,
          ),
          situacao: m.situacao as SituacaoMandato,
        }),
    ),
    filiacoes: filiacaoRows.map(
      (f) =>
        new FiliacaoPartidaria(
          new Partido(f.partidoSigla, f.partidoNome),
          new DateRange(
            parseDate(f.periodoInicio),
            f.periodoFim ? parseDate(f.periodoFim) : null,
          ),
        ),
    ),
    comissoes: comissaoRows.map(
      (c) =>
        new MembroComissao(
          c.comissaoId,
          c.nomeComissao,
          c.tipo as TipoParticipacao,
          new DateRange(
            parseDate(c.periodoInicio),
            c.periodoFim ? parseDate(c.periodoFim) : null,
          ),
        ),
    ),
    frentes: frenteRows.map(
      (f) =>
        new FrenteParlamentar(f.frenteId, f.titulo, f.tipo as TipoParticipacao),
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}
