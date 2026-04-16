import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { Gasto, type GastoConstructorProps } from './gasto.aggregate'
import type { GastoId } from './value-objects/gasto-id.vo'

export class GastoFakeBuilder {
  private props: GastoConstructorProps

  private constructor() {
    this.props = {
      parlamentarIdExterno: '12345',
      ano: 2025,
      mes: 1,
      tipoDespesa: 'MANUTENÇÃO DE ESCRITÓRIO',
      codDocumento: 100001,
      tipoDocumento: 'Nota Fiscal',
      dataDocumento: new Date('2025-01-15'),
      numDocumento: 'NF-001',
      valorDocumento: 1500.0,
      urlDocumento: 'https://example.com/doc.pdf',
      nomeFornecedor: 'Empresa XYZ Ltda',
      cnpjCpfFornecedor: '12345678000190',
      valorLiquido: 1500.0,
      valorGlosa: 0,
      trust: TrustMetadata.official(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/12345/despesas',
      ),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }
  }

  static aGasto(): GastoFakeBuilder {
    return new GastoFakeBuilder()
  }

  withGastoId(id: GastoId): this {
    this.props.gastoId = id
    return this
  }

  withParlamentarIdExterno(id: string): this {
    this.props.parlamentarIdExterno = id
    return this
  }

  withAno(ano: number): this {
    this.props.ano = ano
    return this
  }

  withMes(mes: number): this {
    this.props.mes = mes
    return this
  }

  withCodDocumento(cod: number): this {
    this.props.codDocumento = cod
    return this
  }

  withValorDocumento(valor: number): this {
    this.props.valorDocumento = valor
    return this
  }

  withValorLiquido(valor: number): this {
    this.props.valorLiquido = valor
    return this
  }

  withNomeFornecedor(nome: string): this {
    this.props.nomeFornecedor = nome
    return this
  }

  withTipoDespesa(tipo: string): this {
    this.props.tipoDespesa = tipo
    return this
  }

  build(): Gasto {
    return new Gasto(this.props)
  }

  static many(count: number): Gasto[] {
    return Array.from({ length: count }, (_, i) =>
      GastoFakeBuilder.aGasto()
        .withParlamentarIdExterno(`${10000 + (i % 5)}`)
        .withCodDocumento(100001 + i)
        .withAno(2025)
        .withMes((i % 12) + 1)
        .withValorDocumento(1000 + i * 100)
        .build(),
    )
  }
}
