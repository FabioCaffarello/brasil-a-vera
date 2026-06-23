// Constrói a URL de compartilhamento a partir da URL corrente, com duas
// garantias:
//
//  1. Canonicaliza: descarta query (cursores/filtros transitórios) e hash —
//     compartilha-se a PÁGINA, não o estado de navegação de quem compartilha.
//  2. Anexa UTM (utm_source por canal + utm_medium=share) para que o analytics
//     (Cloudflare Web Analytics, item 0) consiga medir o tráfego de retorno
//     vindo de compartilhamento. Público por design — vai na URL compartilhada.
//
// Pura (recebe a URL como string; sem `window`) → testável.

export type ShareSource = 'whatsapp' | 'twitter' | 'copy'

export function buildShareUrl(rawUrl: string, source: ShareSource): string {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    // URL inválida (ex.: string vazia em SSR) — devolve como veio, sem quebrar.
    return rawUrl
  }
  // Canônico: zera query + hash antes de aplicar só os utm_*.
  u.search = ''
  u.hash = ''
  u.searchParams.set('utm_source', source)
  u.searchParams.set('utm_medium', 'share')
  return u.toString()
}
