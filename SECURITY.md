# Security

O Brasil a Vera é uma plataforma cívica de transparência política. Levamos
relatos de vulnerabilidade a sério.

## Como reportar uma vulnerabilidade

Para reportar uma vulnerabilidade, use **GitHub Security Advisories**:

1. Acesse <https://github.com/FabioCaffarello/brasil-a-vera/security/advisories/new>
2. Descreva a vulnerabilidade, passos para reproduzir e o impacto
   esperado
3. Anexe evidência (logs, screenshots, prova de conceito) quando possível

Alternativamente, envie e-mail direto para `fabio.caffarello+security@gmail.com`.

**Não abra issue pública para relatos de segurança** — relatos via
issue pública podem expor a vulnerabilidade antes do conserto.

## Compromisso de resposta

- Acuso recebimento em até 5 dias úteis.
- Avalio severidade e abro plano de correção em até 14 dias.
- Mantenho o reporter informado das próximas etapas até a publicação
  do fix.

Como projeto solo mantido por doação, esses prazos podem ser
estendidos em casos extremos — sempre com comunicação clara.

## Escopo

### Em escopo

- Código deste repositório (TypeScript + ingestão + workflows + Workers
  config).
- Dados expostos publicamente em <https://brasilavera.org>.
- Pipelines de ingestão e tratamento de dados oficiais.
- Configuração de deploy (Cloudflare Workers, Neon Postgres).

### Fora de escopo

- Vulnerabilidades nas **APIs públicas que consumimos** (Câmara dos
  Deputados, Senado Federal, TSE, Portal da Transparência) — reporte
  diretamente aos donos dessas APIs.
- Sistemas terceiros (Clerk, Cloudflare, Neon, GitHub). Esses têm
  programas próprios.
- Resultados de varredura automática sem PoC concreto.

## Reconhecimento

Pesquisadores que relatam vulnerabilidades de boa-fé são reconhecidos
publicamente após o fix (a menos que prefiram anonimato). Não há
programa de bug bounty financeiro no momento — projeto é mantido por
doação.

## Apartidarismo

Este projeto é estritamente apartidário. Relatos que tentem usar a
plataforma de segurança para pressões políticas serão recusados —
seguindo o mesmo princípio que rege todo o CONTRIBUTING.
