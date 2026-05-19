// Janelas de tempo + idempotency key para o cron de alertas — Wave 10
// Etapa 7.
//
// Padrão semanal: período = [last_sunday_21_UTC, next_sunday_21_UTC).
// O cron roda no `scheduled_for` que é o fim do período (próximo
// domingo 21:00 UTC). O conteúdo do report cobre os 7 dias anteriores.
//
// Decisão de timezone: 21:00 UTC = 18:00 BRT. Brasil sem horário de
// verão desde 2019 (Decreto 9.772). Sem DST → mesmo horário em SP
// ano todo.

import type { AlertPolicyFields } from '@/lib/constants/alert-policy'

export interface WeeklyPeriod {
  periodStart: Date
  periodEnd: Date
  scheduledFor: Date
}

/**
 * Computa o próximo `scheduled_for` (próximo domingo 21:00 UTC a
 * partir de `now`). Idempotente para a mesma semana — o cron pode
 * rodar várias vezes na mesma janela; sempre devolve o mesmo
 * `periodStart`/`periodEnd`.
 */
export function currentWeeklyPeriod(now: Date): WeeklyPeriod {
  // Próximo domingo às 21:00 UTC. Domingo = 0 em getUTCDay().
  const next = new Date(now)
  next.setUTCHours(21, 0, 0, 0)
  const dayOfWeek = next.getUTCDay() // 0 = domingo
  let daysUntilSunday = (7 - dayOfWeek) % 7
  // Se hoje é domingo E ainda não passou das 21:00, scheduled é hoje;
  // senão, próximo domingo.
  if (daysUntilSunday === 0 && now.getTime() >= next.getTime()) {
    daysUntilSunday = 7
  }
  next.setUTCDate(next.getUTCDate() + daysUntilSunday)
  const scheduledFor = next

  const periodEnd = scheduledFor
  const periodStart = new Date(periodEnd)
  periodStart.setUTCDate(periodStart.getUTCDate() - 7)

  return { periodStart, periodEnd, scheduledFor }
}

/**
 * Idempotency key — sha256(user_id + period_start_iso + cadence + channel).
 * Inclui `channel` (divergência consciente de LOGGED-AREA-VISION §6,
 * que omitiu): suporta 1 row por canal sem conflito de unique key.
 *
 * Implementação via Web Crypto API (disponível em Cloudflare Workers
 * e Node 20+ no test env).
 */
export async function computeIdempotencyKey(input: {
  userId: string
  periodStart: Date
  cadence: AlertPolicyFields['cadence']
  channel: 'email' | 'inapp'
}): Promise<string> {
  const payload = `${input.userId}|${input.periodStart.toISOString()}|${input.cadence}|${input.channel}`
  const bytes = new TextEncoder().encode(payload)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(hash))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
