// Cliente Resend para envio do report semanal — Wave 10 Etapa 7.3.
//
// Wrapper sobre o SDK `resend` que centraliza:
//   - leitura das env vars (RESEND_API_KEY, RESEND_FROM)
//   - validação eager (fail-fast no startup se falta config)
//   - tradução de erros para tipo discriminado pra caller decidir
//     retry/mark-failed sem precisar try/catch espalhado
//
// Quando criar uma segunda categoria de email (signup welcome, reset,
// etc.), criar helper específico aqui — não usar Resend SDK direto no
// route handler.

import { Resend } from 'resend'

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

/**
 * Resolve o cliente Resend a partir das env vars. Retorna `null` se
 * faltam credenciais (caller decide se loga e segue, ou aborta).
 */
function getResendClient(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) return null
  return { resend: new Resend(apiKey), from }
}

/**
 * Envia um email via Resend. Não faz retry — caller marca delivery
 * como `failed` em erro; reenvio explícito (manual ou em janela
 * futura) é responsabilidade fora desta função.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const client = getResendClient()
  if (!client) {
    return {
      ok: false,
      error: 'resend_not_configured (RESEND_API_KEY ou RESEND_FROM ausente)',
    }
  }

  try {
    const result = await client.resend.emails.send({
      from: client.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })

    if (result.error) {
      return {
        ok: false,
        error: `resend_api_error: ${result.error.name ?? 'unknown'} — ${result.error.message ?? ''}`,
      }
    }
    if (!result.data?.id) {
      return { ok: false, error: 'resend_api_no_message_id' }
    }
    return { ok: true, messageId: result.data.id }
  } catch (err) {
    return {
      ok: false,
      error: `resend_throw: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * `true` se as env vars necessárias estão setadas. Útil para
 * smoke check no endpoint de cron antes de processar email.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
}
