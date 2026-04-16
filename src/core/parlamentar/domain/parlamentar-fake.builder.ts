import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import {
  Parlamentar,
  type ParlamentarConstructorProps,
} from './parlamentar.aggregate'
import type { ParlamentarId } from './value-objects/parlamentar-id.vo'
import { Partido } from './value-objects/partido.vo'

export class ParlamentarFakeBuilder {
  private props: ParlamentarConstructorProps

  private constructor() {
    this.props = {
      idExterno: '12345',
      nome: 'João da Silva',
      nomeCivil: 'João Batista da Silva',
      cpf: '12345678901',
      uf: 'SP',
      partidoAtual: new Partido('PT', 'Partido dos Trabalhadores'),
      urlFoto: 'https://example.com/foto.jpg',
      casa: 'CAMARA',
      trust: TrustMetadata.official('https://dadosabertos.camara.leg.br'),
      mandatos: [],
      filiacoes: [],
      comissoes: [],
      frentes: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }
  }

  static aParlamentar(): ParlamentarFakeBuilder {
    return new ParlamentarFakeBuilder()
  }

  withParlamentarId(id: ParlamentarId): this {
    this.props.parlamentarId = id
    return this
  }

  withIdExterno(idExterno: string): this {
    this.props.idExterno = idExterno
    return this
  }

  withNome(nome: string): this {
    this.props.nome = nome
    return this
  }

  withNomeCivil(nomeCivil: string | null): this {
    this.props.nomeCivil = nomeCivil
    return this
  }

  withCpf(cpf: string | null): this {
    this.props.cpf = cpf
    return this
  }

  withUf(uf: string): this {
    this.props.uf = uf
    return this
  }

  withPartido(sigla: string, nome: string): this {
    this.props.partidoAtual = new Partido(sigla, nome)
    return this
  }

  withUrlFoto(urlFoto: string | null): this {
    this.props.urlFoto = urlFoto
    return this
  }

  withCasa(casa: 'CAMARA' | 'SENADO'): this {
    this.props.casa = casa
    return this
  }

  withTrust(trust: TrustMetadata): this {
    this.props.trust = trust
    return this
  }

  build(): Parlamentar {
    return new Parlamentar(this.props)
  }

  static many(count: number): Parlamentar[] {
    return Array.from({ length: count }, (_, i) =>
      ParlamentarFakeBuilder.aParlamentar()
        .withIdExterno(`${10000 + i}`)
        .withNome(`Parlamentar ${i + 1}`)
        .withUf(['SP', 'RJ', 'MG', 'BA', 'RS'][i % 5])
        .build(),
    )
  }
}
