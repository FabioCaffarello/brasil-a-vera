# ADR-052: Drawers nas rotas de votações e filtro de votos em estado local

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-23
> Status: accepted

## Contexto

As rotas de votações tinham dois atritos de UX/manutenção:

1. **Listagem sem preview.** Clicar num `VotacaoCard` navegava direto para o
   perfil. Parlamentares e proposições já tinham um padrão de *preview-drawer*
   (fábrica `createPreview`, `src/components/preview/create-preview.tsx`) que
   abre um painel lateral com um resumo derivado dos campos que o card já
   recebe — zero fetch novo, progressive enhancement (sem JS continua um
   `<a href>` navegável). Votações ficaram de fora.

2. **Votos individuais inline + filtro em URL.** O perfil (`/votacoes/[id]`)
   montava a lista completa de votos individuais (~513 deputados / ~81
   senadores) inline, inflando o DOM inicial. O filtro por direção do voto era
   um parâmetro de URL `?voto=X` lido por `useSearchParams`, embora o servidor
   nunca refiltrasse com base nele — `getVotosByVotacao` sempre carrega a lista
   completa e o filtro acontece 100% no cliente via `useMemo`. O comentário em
   `src/lib/queries/votacoes.ts` já antecipava a migração desse filtro para
   estado client-side (D7).

A decisão precisa registrar (a) a política do preview-drawer de listagem e (b)
a mudança no contrato de URL `?voto=X`, que afeta deep-links.

## Decisão

**1. Preview-drawer de listagem com a mesma disciplina dos existentes.**
`VotacaoPreviewDrawer` (`src/components/votacao/preview-drawer.tsx`) consome
**apenas** os campos que o `VotacaoCard` já recebe de `listVotacoesCursor`
(data, casa, órgão, resultado, votosSim/Não/abstenções). O corpo é
`MargemDecisaoBar` + resumo dos votos + CTA "Ver perfil completo". **"Votos por
partido" e votos individuais não entram no preview** — exigiriam JOIN por
clique (viola o princípio 8 de disciplina de custo); o CTA leva ao perfil, onde
essas seções já existem.

**2. Votos individuais num drawer sob CTA, com filtro em estado local.**
`VotosDrawer` (`src/components/votacao/votos-drawer.tsx`) substitui a lista
inline por um CTA "Ver todos os N votos"; os `<li>` só montam quando o drawer
abre (ganho de render, não de fetch — o payload já vinha do servidor). O filtro
por direção passou de `?voto=X` na URL para `useState` local em
`VotosIndividuais`. Para preservar deep-links existentes, o drawer lê
`?voto=X` **uma vez no mount** para semear o filtro e abrir já filtrado; daí em
diante o filtro é estado local e não reescreve a URL.

## Alternativas Consideradas

### Drawer também no perfil para "votos por partido" / preview com per-partido
- Exigiria fetch on-demand ou agregação por clique. Rejeitado nesta rodada por
  custo (princípio 8); o perfil já tem a seção "Por partido".

### Manter `?voto=X` como filtro server-side / URL canônica
- O servidor nunca usou o param para filtrar (a lista vem inteira e o filtro é
  client). Manter o param na URL em uso normal só polui o histórico de
  navegação sem benefício. O seed no mount preserva o único valor real do param
  (deep-link), então descontinuá-lo do uso corrente não perde funcionalidade.

## Consequências

### Positivas
- Paridade de UX entre as três listagens (parlamentar, proposição, votação).
- DOM inicial do perfil mais leve: CTA em vez de ~513 itens montados.
- Filtro de votos deixa de depender de navegação/URL; menos acoplamento.
- `ExportCsvLink` (`/api/export/votacoes/[id]/votos`) é independente do filtro
  e continua exportando a lista completa.

### Negativas
- `?voto=X` deixa de ser reescrito na URL durante o uso normal — é uma quebra
  suave do contrato anterior, mitigada pelo seed no mount (deep-links antigos
  continuam abrindo já filtrados).
- O drawer de votos não usa a fábrica `createPreview` (recebe a lista inteira
  por props, não um "item de card"); é um drawer controlado por `useState`
  próprio — uma segunda forma de drawer no código, justificada pela diferença
  de origem dos dados.

### Neutras
- O payload server (lista completa de votos) não muda; o ganho é de render.
  Adiar também o payload (fetch on-demand) fica como follow-up se o Lighthouse
  pedir.

## Referências
- `src/components/preview/create-preview.tsx` (fábrica de preview, zero fetch)
- `src/components/parlamentar/preview-drawer.tsx`,
  `src/components/proposicao/preview-drawer.tsx` (padrão espelhado)
- ADR-033/034/038 (consumo do RDS, import boundary, wrapper `rds-drawer`)
- Princípio 8 (CLAUDE.md — disciplina de custo Neon)
