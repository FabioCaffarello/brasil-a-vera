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
