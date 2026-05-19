// Pure builder do payload de export LGPD — Wave 10 Etapa 9.4.
//
// Recebe os snapshots de cada tabela do bounded context Usuário e
// devolve um objeto JSON-serializable estável. Função pura: dado o
// mesmo input, mesmo output; sem IO. Permite testar a estrutura do
// export sem precisar de testcontainers.
//
// Formato versionado via `schema` no topo do payload — Wave 11+
// pode evoluir sem quebrar tooling externo do titular.

import type {
  AlertDelivery,
  ConsentLog,
  Follow,
  AlertPolicy as RawAlertPolicy,
  UserProfile,
} from '@/modules/usuario/domain/schema'

export interface ExportPayload {
  schema: '1'
  exportedAt: string
  user: {
    id: string
    clerkUserId: string
    email: string
    displayName: string | null
    uf: string | null
    themes: string[]
    marketingOptedIn: boolean
    surveyOptedIn: boolean
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    onboardedAt: string | null
  }
  follows: Array<{
    parlamentarId: string
    followedAt: string
  }>
  alertPolicy: {
    cadence: string
    channelEmail: boolean
    channelInapp: boolean
    topicVotacoes: boolean
    topicGastos: boolean
    topicProposicoes: boolean
    topicDiscursos: boolean
    topicDivergencias: boolean
    boostEleicoes: boolean
    boostCpis: boolean
    boostProposicoesMarcadas: boolean
    updatedAt: string
  } | null
  alertDeliveries: Array<{
    id: string
    idempotencyKey: string
    channel: string
    subject: string
    scheduledFor: string
    deliveredAt: string | null
    readAt: string | null
    status: string
  }>
  consentLog: Array<{
    id: string
    scope: string
    granted: boolean
    legalBasis: string
    policyVersion: string
    source: string
    consentedAt: string
  }>
}

export interface BuildExportPayloadInput {
  exportedAt: Date
  user: UserProfile
  follows: Follow[]
  alertPolicy: RawAlertPolicy | null
  alertDeliveries: AlertDelivery[]
  consentLog: ConsentLog[]
}

export function buildExportPayload(
  input: BuildExportPayloadInput,
): ExportPayload {
  return {
    schema: '1',
    exportedAt: input.exportedAt.toISOString(),
    user: {
      id: input.user.id,
      clerkUserId: input.user.clerkUserId,
      email: input.user.email,
      displayName: input.user.displayName,
      uf: input.user.uf,
      themes: input.user.themes,
      marketingOptedIn: input.user.marketingOptedIn,
      surveyOptedIn: input.user.surveyOptedIn,
      createdAt: input.user.createdAt.toISOString(),
      updatedAt: input.user.updatedAt.toISOString(),
      deletedAt: input.user.deletedAt?.toISOString() ?? null,
      onboardedAt: input.user.onboardedAt?.toISOString() ?? null,
    },
    follows: input.follows.map((f) => ({
      parlamentarId: f.parlamentarId,
      followedAt: f.followedAt.toISOString(),
    })),
    alertPolicy: input.alertPolicy
      ? {
          cadence: input.alertPolicy.cadence,
          channelEmail: input.alertPolicy.channelEmail,
          channelInapp: input.alertPolicy.channelInapp,
          topicVotacoes: input.alertPolicy.topicVotacoes,
          topicGastos: input.alertPolicy.topicGastos,
          topicProposicoes: input.alertPolicy.topicProposicoes,
          topicDiscursos: input.alertPolicy.topicDiscursos,
          topicDivergencias: input.alertPolicy.topicDivergencias,
          boostEleicoes: input.alertPolicy.boostEleicoes,
          boostCpis: input.alertPolicy.boostCpis,
          boostProposicoesMarcadas: input.alertPolicy.boostProposicoesMarcadas,
          updatedAt: input.alertPolicy.updatedAt.toISOString(),
        }
      : null,
    alertDeliveries: input.alertDeliveries.map((d) => ({
      id: d.id,
      idempotencyKey: d.idempotencyKey,
      channel: d.channel,
      subject: d.subject,
      // bodyMd é omitido do export para reduzir o tamanho do JSON;
      // titular pode buscar o corpo em /painel/alertas se quiser.
      scheduledFor: d.scheduledFor.toISOString(),
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      readAt: d.readAt?.toISOString() ?? null,
      status: d.status,
    })),
    consentLog: input.consentLog.map((c) => ({
      id: c.id,
      scope: c.scope,
      granted: c.granted,
      legalBasis: c.legalBasis,
      policyVersion: c.policyVersion,
      source: c.source,
      // ip_hash é omitido do export para o próprio titular: o hash
      // é mecanismo de prova interna, não dado pessoal a portar.
      consentedAt: c.consentedAt.toISOString(),
    })),
  }
}
