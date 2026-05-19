// Hash de IP para `consent_log.ip_hash` — Wave 10 Etapa 9.2.
//
// LGPD art. 6º X (responsabilização): consent_log precisa comprovar
// "esse consentimento veio dessa origem nesse momento" sem permitir
// reidentificação retroativa do titular pelo IP em claro.
//
// Estratégia: SHA-256 sobre `ip + ":" + YYYY-MM-DD + ":" + salt`.
// - SHA-256 é one-way: dump do banco não revela IP sem força bruta
//   (4 bilhões de IPv4 são tratáveis, então o salt é essencial).
// - Salt vem de Workers Secret `IP_HASH_SALT` (32 bytes hex,
//   `openssl rand -hex 32`). Adversário sem o salt não consegue
//   enumerar mesmo conhecendo a data.
// - Data no input: dois consents do MESMO IP em DIAS diferentes
//   geram hashes diferentes. Comprova "veio do mesmo IP no mesmo
//   dia" para auditoria, sem revelar correlação cross-day.
//
// Decisão consciente Wave 10: salt FIXO (não rotativo diariamente).
// Trade-off: simplicidade operacional vs. compromise window de N
// dias se o salt vazar. Reabrir como salt rotativo se ANPD entender
// que é exigência (LOGGED-AREA-VISION §9, questão aberta).
//
// `extractIpFromRequest`: Cloudflare Workers garante header
// `cf-connecting-ip` em todo request (request original do cliente).
// `x-forwarded-for` é fallback defensivo se a app rodar fora de CF
// (dev local). Não confiar em `x-forwarded-for` em produção — pode
// ser forjado por qualquer proxy intermediário se não houver
// validação anterior.

export interface HashIpInput {
  ip: string
  date: Date
  salt: string
}

/**
 * Computa SHA-256 hex de `ip + ":" + YYYY-MM-DD + ":" + salt`.
 *
 * Data formatada em UTC para evitar divergência cross-timezone
 * (consent feito 23:30 BRT vira dia seguinte UTC; ambos do mesmo
 * cidadão no mesmo "dia operacional"). Aceitar isso é mais simples
 * que normalizar para BRT — UTC é o relógio do banco e do cron.
 */
export async function hashIp(input: HashIpInput): Promise<string> {
  const dateUtc = formatDateUtc(input.date)
  const payload = `${input.ip}:${dateUtc}:${input.salt}`
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

/**
 * Extrai o IP do cliente do request. Prioridade:
 *   1. `cf-connecting-ip` (garantido pelo Cloudflare Workers)
 *   2. `x-forwarded-for` primeira entrada (fallback dev local)
 * Devolve `null` se nenhum estiver presente — caller decide o que
 * fazer (gravar string vazia para preservar log sem fingir IP).
 */
export function extractIpFromRequest(req: Request): string | null {
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp && cfIp.length > 0) return cfIp

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded && forwarded.length > 0) {
    // x-forwarded-for: "client, proxy1, proxy2" — o primeiro é o original.
    const first = forwarded.split(',')[0]?.trim()
    if (first && first.length > 0) return first
  }
  return null
}

/**
 * Lê o salt do ambiente. Devolve `null` se não configurado —
 * caller decide entre falhar (produção) ou aceitar string vazia
 * (dev local sem salt configurado).
 */
export function getIpSalt(): string | null {
  const salt = process.env.IP_HASH_SALT
  if (!salt || salt.length === 0) return null
  return salt
}

/**
 * Helper composto: extrai IP do request + lê salt + computa hash.
 * Devolve string vazia se faltar IP ou salt — o consent_log fica
 * funcional (`ip_hash = ''`) mas sem comprovação de origem. O
 * caller pode logar via `notifyMissingIpOrSalt` se quiser
 * telemetria; para 9.2 só registramos sem comprovação.
 */
export async function hashIpFromRequest(
  req: Request,
  now: Date = new Date(),
): Promise<string> {
  const ip = extractIpFromRequest(req)
  const salt = getIpSalt()
  if (!ip || !salt) return ''
  return await hashIp({ ip, date: now, salt })
}

function formatDateUtc(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
