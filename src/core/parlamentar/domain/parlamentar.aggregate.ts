import { AggregateRoot } from '@/core/shared/domain/aggregate-root'
import type { ValueObject } from '@/core/shared/domain/value-object'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import type { FiliacaoPartidaria } from './filiacao-partidaria.entity'
import type { FrenteParlamentar } from './frente-parlamentar.entity'
import type { Mandato } from './mandato.entity'
import type { MembroComissao } from './membro-comissao.entity'
import { validateParlamentar } from './parlamentar.validator'
import type { Casa } from './value-objects/casa.vo'
import { ParlamentarId } from './value-objects/parlamentar-id.vo'
import { Partido } from './value-objects/partido.vo'

export type ParlamentarConstructorProps = {
  parlamentarId?: ParlamentarId
  idExterno: string
  nome: string
  nomeCivil?: string | null
  cpf?: string | null
  uf: string
  partidoAtual: Partido
  urlFoto?: string | null
  casa: Casa
  trust: TrustMetadata
  mandatos?: Mandato[]
  filiacoes?: FiliacaoPartidaria[]
  comissoes?: MembroComissao[]
  frentes?: FrenteParlamentar[]
  createdAt?: Date
  updatedAt?: Date
}

export type ParlamentarCreateCommand = {
  idExterno: string
  nome: string
  nomeCivil?: string | null
  cpf?: string | null
  uf: string
  partidoSigla: string
  partidoNome: string
  urlFoto?: string | null
  casa: Casa
  sourceUrl: string
}

export class Parlamentar extends AggregateRoot {
  parlamentarId: ParlamentarId
  idExterno: string
  nome: string
  nomeCivil: string | null
  cpf: string | null
  uf: string
  partidoAtual: Partido
  urlFoto: string | null
  casa: Casa
  trust: TrustMetadata
  mandatos: Mandato[]
  filiacoes: FiliacaoPartidaria[]
  comissoes: MembroComissao[]
  frentes: FrenteParlamentar[]
  createdAt: Date
  updatedAt: Date

  constructor(props: ParlamentarConstructorProps) {
    super()
    this.parlamentarId = props.parlamentarId ?? new ParlamentarId()
    this.idExterno = props.idExterno
    this.nome = props.nome
    this.nomeCivil = props.nomeCivil ?? null
    this.cpf = props.cpf ?? null
    this.uf = props.uf
    this.partidoAtual = props.partidoAtual
    this.urlFoto = props.urlFoto ?? null
    this.casa = props.casa
    this.trust = props.trust
    this.mandatos = props.mandatos ?? []
    this.filiacoes = props.filiacoes ?? []
    this.comissoes = props.comissoes ?? []
    this.frentes = props.frentes ?? []
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  get entityId(): ValueObject {
    return this.parlamentarId
  }

  static create(command: ParlamentarCreateCommand): Parlamentar {
    const parlamentar = new Parlamentar({
      idExterno: command.idExterno,
      nome: command.nome,
      nomeCivil: command.nomeCivil,
      cpf: command.cpf,
      uf: command.uf,
      partidoAtual: new Partido(command.partidoSigla, command.partidoNome),
      urlFoto: command.urlFoto,
      casa: command.casa,
      trust: TrustMetadata.official(command.sourceUrl),
    })
    parlamentar.validate()
    return parlamentar
  }

  changePartido(sigla: string, nome: string): void {
    this.partidoAtual = new Partido(sigla, nome)
    this.touch()
  }

  addMandato(mandato: Mandato): void {
    this.mandatos.push(mandato)
    this.touch()
  }

  addFiliacao(filiacao: FiliacaoPartidaria): void {
    this.filiacoes.push(filiacao)
    this.touch()
  }

  updateDetalhes(nomeCivil: string | null, cpf: string | null): void {
    this.nomeCivil = nomeCivil
    this.cpf = cpf
    this.touch()
  }

  addComissao(comissao: MembroComissao): void {
    this.comissoes.push(comissao)
    this.touch()
  }

  replaceComissoes(comissoes: MembroComissao[]): void {
    this.comissoes = comissoes
    this.touch()
  }

  addFrente(frente: FrenteParlamentar): void {
    this.frentes.push(frente)
    this.touch()
  }

  validate(): boolean {
    return validateParlamentar(this.notification, {
      nome: this.nome,
      uf: this.uf,
      casa: this.casa,
      partidoAtual: this.partidoAtual,
    })
  }

  private touch(): void {
    this.updatedAt = new Date()
  }

  toJSON(): Record<string, unknown> {
    return {
      parlamentarId: this.parlamentarId.id,
      idExterno: this.idExterno,
      nome: this.nome,
      nomeCivil: this.nomeCivil,
      cpf: this.cpf,
      uf: this.uf,
      partidoAtual: {
        sigla: this.partidoAtual.sigla,
        nome: this.partidoAtual.nome,
      },
      urlFoto: this.urlFoto,
      casa: this.casa,
      trustLevel: this.trust.trustLevel,
      sourceUrl: this.trust.sourceUrl,
      mandatos: this.mandatos.map((m) => m.toJSON()),
      filiacoes: this.filiacoes.map((f) => ({
        partido: { sigla: f.partido.sigla, nome: f.partido.nome },
        periodo: { start: f.periodo.start, end: f.periodo.end },
      })),
      comissoes: this.comissoes.map((c) => ({
        comissaoId: c.comissaoId,
        nomeComissao: c.nomeComissao,
        tipo: c.tipo,
        periodo: { start: c.periodo.start, end: c.periodo.end },
      })),
      frentes: this.frentes.map((f) => ({
        frenteId: f.frenteId,
        titulo: f.titulo,
        tipo: f.tipo,
      })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
