// Conversão markdown → HTML para o email do report semanal — Wave 10
// Etapa 7.3.
//
// Wrapper fino sobre `marked` com configuração travada (no html input,
// GFM on). Sem sanitização de HTML do INPUT — o markdown é gerado pelo
// nosso composer (LOGGED-AREA-VISION §6), não user-provided; trust
// implícito. Se um dia o body_md vier de usuário, adicionar DOMPurify.

import { marked } from 'marked'

marked.setOptions({
  // Newlines fora de bloco viram <br/>. Útil pra formatação inline do
  // composer (assinatura, contato DPO).
  breaks: true,
  // GFM: tabelas, strikethrough, autolinks.
  gfm: true,
})

/**
 * Renderiza markdown como HTML. Síncrono (marked aceita sync mode com
 * sync extensions; sem extensões custom aqui).
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string
}

/**
 * Envolve o HTML do report em uma página completa minimalista. Email
 * clients exigem `<!doctype>` + `<html>` para renderização confiável.
 * Sem CSS externo — pode ser bloqueado por alguns clients (Gmail strip
 * <head>); usa font-family inline e cores semânticas do system.
 */
export function wrapHtmlForEmail(innerHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brasil à Vera · Resumo semanal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #18181b; max-width: 640px; margin: 0 auto; padding: 24px;">
${innerHtml}
</body>
</html>`
}
