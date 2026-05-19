// Composer do email de lembrete pré-hard-delete — Wave 10 Etapa 9.6.
//
// O email tem natureza de comunicação transacional (estado da conta),
// não de marketing — é enviado mesmo se `marketingOptedIn = false`.
// Comunicação obrigatória sob LGPD art. 9º I (transparência) +
// art. 18 (direitos do titular: aviso pré-hard-delete dá ao titular
// chance de reagir).
//
// Pure: dado o mesmo input, mesmo output; sem IO. Permite testar
// estrutura do email sem fixtures complexos.

export interface BuildReminderEmailInput {
  email: string
  displayName: string | null
  deletedAt: Date
  /** Data esperada do hard-delete (deletedAt + 30 dias) */
  hardDeleteAt: Date
  /** Hoje (passado pelo caller para output determinístico). */
  now: Date
  /** URL absoluta para o sign-in (ex.: https://brasilavera.org/sign-in). */
  signInUrl: string
}

export interface ReminderEmail {
  subject: string
  bodyMd: string
  /** Quantos dias faltam para hard delete (sempre ≥ 0). */
  daysRemaining: number
}

export function buildReminderEmail(
  input: BuildReminderEmailInput,
): ReminderEmail {
  const daysRemaining = Math.max(0, daysBetween(input.now, input.hardDeleteAt))
  const greeting = input.displayName ? `Olá, ${input.displayName}` : 'Olá'
  const deletedAtPt = formatDateBR(input.deletedAt)
  const hardDeleteAtPt = formatDateBR(input.hardDeleteAt)

  const subject = `Brasil à Vera · sua conta será eliminada em ${daysRemaining} dia${
    daysRemaining === 1 ? '' : 's'
  }`

  const bodyMd = [
    `# Sua conta será eliminada em ${daysRemaining} dia${
      daysRemaining === 1 ? '' : 's'
    }`,
    '',
    greeting + ',',
    '',
    `Você solicitou a eliminação da sua conta no Brasil à Vera em **${deletedAtPt}**.`,
    `A eliminação definitiva acontece em **${hardDeleteAtPt}** — faltam ${daysRemaining} dia${
      daysRemaining === 1 ? '' : 's'
    }.`,
    '',
    '## Se quiser voltar atrás',
    '',
    `Basta fazer login antes da data limite — sua conta é reativada automaticamente.`,
    '',
    `[Fazer login agora](${input.signInUrl})`,
    '',
    '## Se não fizer nada',
    '',
    'Sua conta e os dados associados (parlamentares acompanhados, política de alertas, histórico de reports) serão eliminados de forma permanente. O log de consentimentos é preservado como registro auditável, sem identificá-lo (LGPD art. 16).',
    '',
    '---',
    '',
    'Esta mensagem é uma comunicação transacional sobre o estado da sua conta. Você não pode desativá-la enquanto sua conta estiver no estado eliminada.',
    '',
    'Brasil à Vera',
  ].join('\n')

  return { subject, bodyMd, daysRemaining }
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function formatDateBR(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}
