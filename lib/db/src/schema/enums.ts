import { pgEnum } from "drizzle-orm/pg-core";

export const trustLevel = pgEnum("trust_level", ["L1", "L2", "L3", "L4"]);
export const casa = pgEnum("casa", ["CAMARA", "SENADO"]);
export const situacaoMandato = pgEnum("situacao_mandato", ["EXERCICIO", "AFASTADO", "SUPLENCIA", "LICENCA"]);
export const tipoParticipacao = pgEnum("tipo_participacao", ["TITULAR", "SUPLENTE"]);
export const tipoProposicao = pgEnum("tipo_proposicao", ["PL", "PEC", "PLP", "MPV", "PDC", "PRC"]);
export const situacaoProposicao = pgEnum("situacao_proposicao", ["TRAMITANDO", "APROVADA", "REJEITADA", "ARQUIVADA", "TRANSFORMADA_EM_NORMA"]);
export const tipoAutoria = pgEnum("tipo_autoria", ["AUTOR", "COAUTOR"]);
export const tipoVoto = pgEnum("tipo_voto", ["SIM", "NAO", "ABSTENCAO", "AUSENTE", "OBSTRUCAO"]);
export const orientacaoBancada = pgEnum("orientacao_bancada", ["SIM", "NAO", "LIBERADO", "OBSTRUCAO"]);
export const tipoGasto = pgEnum("tipo_gasto", ["CEAP", "VERBA_GABINETE", "AUXILIO_MORADIA"]);
