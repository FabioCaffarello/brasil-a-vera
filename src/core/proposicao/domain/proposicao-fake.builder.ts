import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import {
  Proposicao,
  type ProposicaoConstructorProps,
} from './proposicao.aggregate'
import type { ProposicaoId } from './value-objects/proposicao-id.vo'
import type { SituacaoProposicao } from './value-objects/situacao-proposicao.vo'
import { Tema } from './value-objects/tema.vo'
import type { TipoProposicao } from './value-objects/tipo-proposicao.vo'

export class ProposicaoFakeBuilder {
  private props: ProposicaoConstructorProps

  private constructor() {
    this.props = {
      idExterno: 'camara-12345',
      casa: 'CAMARA',
      tipo: 'PL',
      numero: 1234,
      ano: 2025,
      ementa: 'Dispõe sobre algo importante para a sociedade.',
      ementaDetalhada: null,
      dataApresentacao: new Date('2025-03-10'),
      autores: ['Deputado Fulano de Tal'],
      temas: [new Tema({ codigoOficial: 40, nome: 'Educação' })],
      situacao: 'TRAMITANDO',
      situacaoDescricao: 'Aguardando designação do relator',
      urlInteiroTeor: 'https://example.com/inteiroteor.pdf',
      trust: TrustMetadata.official(
        'https://dadosabertos.camara.leg.br/api/v2/proposicoes/12345',
      ),
      createdAt: new Date('2025-03-10'),
      updatedAt: new Date('2025-03-10'),
    }
  }

  static aProposicao(): ProposicaoFakeBuilder {
    return new ProposicaoFakeBuilder()
  }

  withProposicaoId(id: ProposicaoId): this {
    this.props.proposicaoId = id
    return this
  }

  withIdExterno(id: string): this {
    this.props.idExterno = id
    return this
  }

  withCasa(casa: 'CAMARA' | 'SENADO'): this {
    this.props.casa = casa
    return this
  }

  withTipo(tipo: TipoProposicao): this {
    this.props.tipo = tipo
    return this
  }

  withNumero(numero: number): this {
    this.props.numero = numero
    return this
  }

  withAno(ano: number): this {
    this.props.ano = ano
    return this
  }

  withEmenta(ementa: string): this {
    this.props.ementa = ementa
    return this
  }

  withSituacao(situacao: SituacaoProposicao): this {
    this.props.situacao = situacao
    return this
  }

  withAutores(autores: string[]): this {
    this.props.autores = autores
    return this
  }

  withTemas(temas: Array<{ codigoOficial: number; nome: string }>): this {
    this.props.temas = temas.map((t) => new Tema(t))
    return this
  }

  build(): Proposicao {
    return new Proposicao(this.props)
  }

  static many(count: number): Proposicao[] {
    const tipos: TipoProposicao[] = ['PL', 'PEC', 'PLP', 'MPV', 'PDL']
    const casas: Array<'CAMARA' | 'SENADO'> = ['CAMARA', 'SENADO']
    return Array.from({ length: count }, (_, i) => {
      const casa = casas[i % 2]
      const prefix = casa === 'CAMARA' ? 'camara' : 'senado'
      return ProposicaoFakeBuilder.aProposicao()
        .withIdExterno(`${prefix}-${1000 + i}`)
        .withCasa(casa)
        .withTipo(tipos[i % tipos.length])
        .withNumero(1000 + i)
        .withAno(2024 + (i % 2))
        .build()
    })
  }
}
