import { ValueObject } from '@/core/shared/domain/value-object'
import type { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import type { TipoParticipacao } from './value-objects/tipo-participacao.vo'

export class MembroComissao extends ValueObject {
  readonly comissaoId: string
  readonly nomeComissao: string
  readonly tipo: TipoParticipacao
  readonly periodo: DateRange

  constructor(
    comissaoId: string,
    nomeComissao: string,
    tipo: TipoParticipacao,
    periodo: DateRange,
  ) {
    super()
    this.comissaoId = comissaoId
    this.nomeComissao = nomeComissao
    this.tipo = tipo
    this.periodo = periodo
  }

  isActive(referenceDate: Date = new Date()): boolean {
    return this.periodo.isActive(referenceDate)
  }
}
