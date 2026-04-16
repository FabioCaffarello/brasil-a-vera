import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { OrientacaoBancada } from './value-objects/orientacao-bancada.vo'
import { ResultadoVotacao } from './value-objects/resultado-votacao.vo'
import type { VotacaoId } from './value-objects/votacao-id.vo'
import type { VotacaoConstructorProps } from './votacao.aggregate'
import { Votacao } from './votacao.aggregate'
import { VotoNominal } from './voto-nominal.entity'

export class VotacaoFakeBuilder {
  private props: VotacaoConstructorProps

  private constructor() {
    this.props = {
      idExterno: '54321',
      proposicaoIdExterno: '12345',
      dataHora: new Date('2024-06-15T14:00:00.000Z'),
      descricao: 'PL 1234/2024 - Emenda substitutiva',
      orgao: 'Plenário',
      resultado: new ResultadoVotacao(300, 100, 10, 20, true),
      votos: [
        new VotoNominal({
          parlamentarIdExterno: '1001',
          tipoVoto: 'SIM',
          dataHora: new Date('2024-06-15T14:05:00.000Z'),
        }),
        new VotoNominal({
          parlamentarIdExterno: '1002',
          tipoVoto: 'NAO',
          dataHora: new Date('2024-06-15T14:05:00.000Z'),
        }),
        new VotoNominal({
          parlamentarIdExterno: '1003',
          tipoVoto: 'ABSTENCAO',
          dataHora: new Date('2024-06-15T14:05:00.000Z'),
        }),
      ],
      orientacoes: [
        new OrientacaoBancada('PT', 'SIM'),
        new OrientacaoBancada('PL', 'NAO'),
        new OrientacaoBancada('MDB', 'LIBERADO'),
        new OrientacaoBancada('PSDB', 'SIM'),
      ],
      trust: TrustMetadata.official('https://dadosabertos.camara.leg.br'),
      createdAt: new Date('2024-06-15'),
      updatedAt: new Date('2024-06-15'),
    }
  }

  static aVotacao(): VotacaoFakeBuilder {
    return new VotacaoFakeBuilder()
  }

  withVotacaoId(id: VotacaoId): this {
    this.props.votacaoId = id
    return this
  }

  withIdExterno(idExterno: string): this {
    this.props.idExterno = idExterno
    return this
  }

  withProposicaoIdExterno(id: string | null): this {
    this.props.proposicaoIdExterno = id
    return this
  }

  withDataHora(dataHora: Date): this {
    this.props.dataHora = dataHora
    return this
  }

  withDescricao(descricao: string): this {
    this.props.descricao = descricao
    return this
  }

  withOrgao(orgao: string): this {
    this.props.orgao = orgao
    return this
  }

  withResultado(resultado: ResultadoVotacao): this {
    this.props.resultado = resultado
    return this
  }

  withVotos(votos: VotoNominal[]): this {
    this.props.votos = votos
    return this
  }

  withOrientacoes(orientacoes: OrientacaoBancada[]): this {
    this.props.orientacoes = orientacoes
    return this
  }

  build(): Votacao {
    return new Votacao(this.props)
  }

  static many(count: number): Votacao[] {
    return Array.from({ length: count }, (_, i) =>
      VotacaoFakeBuilder.aVotacao()
        .withIdExterno(`${50000 + i}`)
        .withDescricao(`Votação ${i + 1}`)
        .build(),
    )
  }
}
