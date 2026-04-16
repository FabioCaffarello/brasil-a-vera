import type { Casa } from '@/core/parlamentar/domain/value-objects/casa.vo'
import { AggregateRoot } from '@/core/shared/domain/aggregate-root'
import type { ValueObject } from '@/core/shared/domain/value-object'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { validateProposicao } from './proposicao.validator'
import { ProposicaoId } from './value-objects/proposicao-id.vo'
import type { SituacaoProposicao } from './value-objects/situacao-proposicao.vo'
import { Tema } from './value-objects/tema.vo'
import type { TipoProposicao } from './value-objects/tipo-proposicao.vo'

export type ProposicaoConstructorProps = {
  proposicaoId?: ProposicaoId
  idExterno: string // "camara-12345" | "senado-98765"
  casa: Casa // CAMARA | SENADO
  tipo: TipoProposicao
  numero: number
  ano: number
  ementa: string
  ementaDetalhada: string | null
  dataApresentacao: Date | null
  autores: string[] // nomes dos autores (Wave 2: refina para FKs)
  temas: Tema[]
  situacao: SituacaoProposicao
  situacaoDescricao: string | null // texto livre da API, preservado para auditoria
  urlInteiroTeor: string | null
  trust: TrustMetadata
  createdAt?: Date
  updatedAt?: Date
}

export type ProposicaoCreateCommand = {
  idExterno: string
  casa: Casa
  tipo: TipoProposicao
  numero: number
  ano: number
  ementa: string
  ementaDetalhada?: string | null
  dataApresentacao?: string | null
  autores?: string[]
  temas?: Array<{ codigoOficial: number; nome: string }>
  situacao?: SituacaoProposicao
  situacaoDescricao?: string | null
  urlInteiroTeor?: string | null
  sourceUrl: string
}

export class Proposicao extends AggregateRoot {
  proposicaoId: ProposicaoId
  idExterno: string
  casa: Casa
  tipo: TipoProposicao
  numero: number
  ano: number
  ementa: string
  ementaDetalhada: string | null
  dataApresentacao: Date | null
  autores: string[]
  temas: Tema[]
  situacao: SituacaoProposicao
  situacaoDescricao: string | null
  urlInteiroTeor: string | null
  trust: TrustMetadata
  createdAt: Date
  updatedAt: Date

  constructor(props: ProposicaoConstructorProps) {
    super()
    this.proposicaoId = props.proposicaoId ?? new ProposicaoId()
    this.idExterno = props.idExterno
    this.casa = props.casa
    this.tipo = props.tipo
    this.numero = props.numero
    this.ano = props.ano
    this.ementa = props.ementa
    this.ementaDetalhada = props.ementaDetalhada
    this.dataApresentacao = props.dataApresentacao
    this.autores = props.autores
    this.temas = props.temas
    this.situacao = props.situacao
    this.situacaoDescricao = props.situacaoDescricao
    this.urlInteiroTeor = props.urlInteiroTeor
    this.trust = props.trust
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  get entityId(): ValueObject {
    return this.proposicaoId
  }

  static create(command: ProposicaoCreateCommand): Proposicao {
    const prop = new Proposicao({
      idExterno: command.idExterno,
      casa: command.casa,
      tipo: command.tipo,
      numero: command.numero,
      ano: command.ano,
      ementa: command.ementa,
      ementaDetalhada: command.ementaDetalhada ?? null,
      dataApresentacao: command.dataApresentacao
        ? new Date(command.dataApresentacao)
        : null,
      autores: command.autores ?? [],
      temas: (command.temas ?? []).map((t) => new Tema(t)),
      situacao: command.situacao ?? 'DESCONHECIDA',
      situacaoDescricao: command.situacaoDescricao ?? null,
      urlInteiroTeor: command.urlInteiroTeor ?? null,
      trust: TrustMetadata.official(command.sourceUrl),
    })
    prop.validate()
    return prop
  }

  /** Atualiza situação e ementa (Wave 2 adiciona histórico de tramitação) */
  updateSituacao(situacao: SituacaoProposicao, descricao: string | null): void {
    this.situacao = situacao
    this.situacaoDescricao = descricao
    this.updatedAt = new Date()
  }

  replaceTemas(temas: Tema[]): void {
    this.temas = temas
    this.updatedAt = new Date()
  }

  replaceAutores(autores: string[]): void {
    this.autores = autores
    this.updatedAt = new Date()
  }

  validate(): boolean {
    return validateProposicao(this.notification, {
      idExterno: this.idExterno,
      tipo: this.tipo,
      numero: this.numero,
      ano: this.ano,
      ementa: this.ementa,
    })
  }

  toJSON(): Record<string, unknown> {
    return {
      proposicaoId: this.proposicaoId.id,
      idExterno: this.idExterno,
      casa: this.casa,
      tipo: this.tipo,
      numero: this.numero,
      ano: this.ano,
      ementa: this.ementa,
      ementaDetalhada: this.ementaDetalhada,
      dataApresentacao: this.dataApresentacao,
      autores: this.autores,
      temas: this.temas.map((t) => ({
        codigoOficial: t.codigoOficial,
        nome: t.nome,
      })),
      situacao: this.situacao,
      situacaoDescricao: this.situacaoDescricao,
      urlInteiroTeor: this.urlInteiroTeor,
      trustLevel: this.trust.trustLevel,
      sourceUrl: this.trust.sourceUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
