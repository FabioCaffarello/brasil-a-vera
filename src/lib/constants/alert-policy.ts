// Tipos e defaults da alert_policy — Wave 10.
//
// Arquivo separado de `src/lib/queries/alert-policy.ts` para evitar
// acoplamento com `db` (Neon driver). Permite imports em testes
// e em client components sem trazer o driver junto.

export interface TopicSelection {
  topicVotacoes: boolean
  topicGastos: boolean
  topicProposicoes: boolean
  topicDiscursos: boolean
  topicDivergencias: boolean
}

// Forma completa de uma alert_policy (sem `userId` e `updatedAt`).
// Wave 10 Etapa 6 — usada pelo form Políticas e pelo endpoint de
// replace.
export interface AlertPolicyFields {
  cadence: 'weekly' | 'biweekly' | 'monthly'
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
}

// Defaults para o caso de pulo total do wizard (LOGGED-AREA-VISION §5.6).
// Justificativa: entregam valor sem inundar — usuário pula → recebe
// report com 3 sinais conservadores; ajusta depois em Políticas (Etapa 6).
export const SKIP_ALL_TOPIC_DEFAULTS: TopicSelection = {
  topicVotacoes: true,
  topicProposicoes: true,
  topicDivergencias: true,
  topicGastos: false,
  topicDiscursos: false,
}

// Defaults completos — mesma forma do schema. Usados quando o
// usuário acessa /painel/alertas sem ter passado pelo wizard (caso
// raro mas legítimo).
export const DEFAULT_ALERT_POLICY: AlertPolicyFields = {
  cadence: 'weekly',
  channelEmail: true,
  channelInapp: true,
  ...SKIP_ALL_TOPIC_DEFAULTS,
  boostEleicoes: true,
  boostCpis: true,
  boostProposicoesMarcadas: true,
}
