import type { Parlamentar } from '../../../domain/parlamentar.aggregate'

export type ParlamentarOutput = {
  parlamentarId: string
  idExterno: string
  nome: string
  nomeCivil: string | null
  cpf: string | null
  uf: string
  partido: { sigla: string; nome: string }
  urlFoto: string | null
  casa: string
  trustLevel: string
  mandatos: Array<{
    mandatoId: string
    legislatura: number
    periodo: { start: Date; end: Date | null }
    situacao: string
  }>
  filiacoes: Array<{
    partido: { sigla: string; nome: string }
    periodo: { start: Date; end: Date | null }
  }>
  comissoes: Array<{
    comissaoId: string
    nomeComissao: string
    tipo: string
    periodo: { start: Date; end: Date | null }
  }>
  frentes: Array<{
    frenteId: string
    titulo: string
    tipo: string
  }>
  createdAt: Date
  updatedAt: Date
}

export function toOutput(entity: Parlamentar): ParlamentarOutput {
  return {
    parlamentarId: entity.parlamentarId.id,
    idExterno: entity.idExterno,
    nome: entity.nome,
    nomeCivil: entity.nomeCivil,
    cpf: entity.cpf,
    uf: entity.uf,
    partido: {
      sigla: entity.partidoAtual.sigla,
      nome: entity.partidoAtual.nome,
    },
    urlFoto: entity.urlFoto,
    casa: entity.casa,
    trustLevel: entity.trust.trustLevel,
    mandatos: entity.mandatos.map((m) => ({
      mandatoId: m.mandatoId.id,
      legislatura: m.legislatura.numero,
      periodo: { start: m.periodo.start, end: m.periodo.end },
      situacao: m.situacao,
    })),
    filiacoes: entity.filiacoes.map((f) => ({
      partido: { sigla: f.partido.sigla, nome: f.partido.nome },
      periodo: { start: f.periodo.start, end: f.periodo.end },
    })),
    comissoes: entity.comissoes.map((c) => ({
      comissaoId: c.comissaoId,
      nomeComissao: c.nomeComissao,
      tipo: c.tipo,
      periodo: { start: c.periodo.start, end: c.periodo.end },
    })),
    frentes: entity.frentes.map((f) => ({
      frenteId: f.frenteId,
      titulo: f.titulo,
      tipo: f.tipo,
    })),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
