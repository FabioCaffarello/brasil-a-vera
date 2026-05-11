import { pgEnum } from 'drizzle-orm/pg-core'

// Enums compartilhados entre bounded contexts.
// Vivem no schema `public` do Postgres por serem vocabulário transversal.
// Novos enums entram aqui quando o bounded context que os introduz é
// implementado — não criamos enums especulativos.

// Pirâmide de Confiança (ver docs/architecture/TRUST-PYRAMID.md)
export const trustLevel = pgEnum('trust_level', ['L1', 'L2', 'L3', 'L4'])

// Casa legislativa (ver docs/domain/DATA-DICTIONARY.md)
export const casa = pgEnum('casa', ['CAMARA', 'SENADO'])

// Situação do mandato do parlamentar
export const situacaoMandato = pgEnum('situacao_mandato', [
  'EXERCICIO',
  'AFASTADO',
  'SUPLENCIA',
  'LICENCA',
])

// Tipo de participação em comissão
export const tipoParticipacao = pgEnum('tipo_participacao', [
  'TITULAR',
  'SUPLENTE',
])

// Tipo de proposição legislativa
export const tipoProposicao = pgEnum('tipo_proposicao', [
  'PL',
  'PEC',
  'PLP',
  'MPV',
  'PDC',
  'PRC',
])

// Situação atual da tramitação de uma proposição
export const situacaoProposicao = pgEnum('situacao_proposicao', [
  'TRAMITANDO',
  'APROVADA',
  'REJEITADA',
  'ARQUIVADA',
  'TRANSFORMADA_EM_NORMA',
])

// Papel de um autor numa proposição
export const tipoAutoria = pgEnum('tipo_autoria', ['AUTOR', 'COAUTOR'])

// Voto individual de um parlamentar numa votação nominal
export const tipoVoto = pgEnum('tipo_voto', [
  'SIM',
  'NAO',
  'ABSTENCAO',
  'AUSENTE',
  'OBSTRUCAO',
])

// Orientação de bancada (partido) para uma votação
export const orientacaoBancada = pgEnum('orientacao_bancada', [
  'SIM',
  'NAO',
  'LIBERADO',
  'OBSTRUCAO',
])

// Tipo de gasto parlamentar
export const tipoGasto = pgEnum('tipo_gasto', [
  'CEAP',
  'VERBA_GABINETE',
  'AUXILIO_MORADIA',
])
