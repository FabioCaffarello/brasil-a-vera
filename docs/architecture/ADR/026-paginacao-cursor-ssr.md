# ADR-026: Paginação por cursor opaco e versionado em listas SSR

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-17
> Status: proposed

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
  - [1. Cursor opaco em query param único `?after=<token>`](#1-cursor-opaco-em-query-param-único-aftertoken)
  - [2. Versionamento do payload do token](#2-versionamento-do-payload-do-token)
  - [3. Page-size fixo: 20](#3-page-size-fixo-20)
  - [4. "Mostrar mais" como `<a>` puro com scroll-restoration nativa](#4-mostrar-mais-como-a-puro-com-scroll-restoration-nativa)
  - [5. Versão desconhecida → redirect permanente para página 1](#5-versão-desconhecida--redirect-permanente-para-página-1)
- [Listas em escopo (Wave 7)](#listas-em-escopo-wave-7)
- [Listas fora de escopo](#listas-fora-de-escopo)
- [Implicações de edge cache (ADR-018)](#implicações-de-edge-cache-adr-018)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 7 (`docs/product/PROMPT-MESTRE-WAVE-7.md` a redigir) introduz
paginação real em 3 listas do produto:

- **Votos recentes** em `/parlamentares/[id]` (hoje hard-coded em `limit=10` em
  `src/lib/queries/parlamentares.ts` via `getVotosRecentes`)
- **Proposições de autoria** em `/parlamentares/[id]` (hoje `limit=5` em
  `getProposicoesAutoradas`)
- **Detalhe de gastos CEAP** em `/parlamentares/[id]` (Sprint 7.4 PR4 — feature
  nova que substitui o resumo agregado por uma drill-down navegável)

Hoje, todas usam limite hard-coded e ocultam a cardinalidade real do conjunto.
Para o **Cidadão Consciente** (persona primária) isso inflaciona a percepção
de completude — ele lê "10 votos" e assume que são os únicos relevantes. Para
o **Jornalista** (P2) é fricção direta: precisa de acesso à lista completa
para investigação.

Duas opções clássicas existem para paginar listas SSR:

1. **Offset-based** (`?page=N`) — clássico, intuitivo
2. **Cursor-based** (`?after=token`) — escala melhor, idempotente para edge cache

A escolha aqui não é trivial: o produto serve URLs que serão **indexadas pelo
Google** (`brasilavera.org/parlamentares/178957?votos=20`) e compartilhadas em
WhatsApp (jornada Cidadão Consciente termina em compartilhamento — ver
[`PARLAMENTAR-360.md` §Compartilhamento Social](../../features/PARLAMENTAR-360.md)).
Mudança de schema interno (`ORDER BY`, tipo de cursor) não pode quebrar
URLs em estado-estável fora do nosso controle.

Este ADR cristaliza o contrato: cursor opaco, **versionado**, com mecânica
de evolução que protege URLs externas contra mudanças futuras de implementação.

## Decisão

### 1. Cursor opaco em query param único `?after=<token>`

Paginação consome **um único query param**: `?after=<base64url-encoded-token>`.
Não exposição de campos internos de ordenação no URL.

```
/parlamentares/123?votos=open&votos_after=eyJ2IjoxLCJkIjoxNzE1NDA0...
```

O token é **opaco para o consumidor** (browser, crawler, usuário copiando o
link). Apenas o server-side decodifica via Zod schema validado.

Múltiplas listas independentes na mesma rota usam prefixos distintos:
`?votos_after=...`, `?propos_after=...`, `?gastos_after=...`. Cada uma
pagina sem interferência.

### 2. Versionamento do payload do token

O payload **dentro** do token tem versionamento de schema:

```typescript
// Schema v1 (atual)
const CursorV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),  // timestamp epoch ms, ORDER BY field 1
  id: z.string().uuid(),            // tiebreaker, ORDER BY field 2 (uuid v7 → monotonic)
})

type CursorV1Payload = z.infer<typeof CursorV1>
```

**Por que versionar 1 byte de overhead**: o token vive em URLs indexadas pelo
Google e compartilhadas. Se em 6 meses precisamos mudar `ORDER BY` (ex.: adicionar
`prioridade` antes de `data_hora`), o cursor v1 não decodifica mais para o
schema novo. Sem versionamento, opções ruins:

- Quebra silenciosa (cursor decodifica errado → resultados off-by-N)
- Re-deploy com path inteiro novo (URLs indexadas morrem)

Com versionamento, o decoder reconhece `{v: 1}` como deprecated e aplica a
estratégia da §5. Custo: 1 byte adicional por token; ganho: liberdade de
evolução perpétua.

### 3. Page-size fixo: 20

Não exposto via URL. Não configurável por consumidor.

- **20 itens** × 4-6 viewports mobile (375×667) ≈ scroll honesto sem chunk over
- Mudança = ADR subsequente (não opt-in pelo URL)
- Padrão alinhado com listas densas do produto (P1 — "densidade > floreio")

Listas curtas naturalmente (afinidade Top 5, top 3 fornecedores) **não usam**
este ADR — são listas com cardinalidade fixa, não páginas.

### 4. "Mostrar mais" como `<a>` puro com scroll-restoration nativa

```html
<a href="/parlamentares/123?votos_after=eyJ...#votos">Mostrar mais</a>
```

- **`<a>`, não `<button>`** — sem JS, sem `onClick`, sem hydration cost
- **Anchor `#secao`** — mantém scroll na seção atual após navegação
- **Scroll-restoration** — Next App Router preserva position nativa
- **Edge cache** — cada cursor URL tem fingerprint determinístico,
  cacheável independentemente (ADR-018)

Layout: `<a>` aparece **no final da lista da seção**, full-width, com label
`Mostrar mais (N restantes)` quando `N` é conhecido baixo custo via `COUNT(*)`.
Quando `N` é desconhecido ou caro: `Mostrar mais`.

### 5. Versão desconhecida → redirect permanente para página 1

Decoder lê `{v: <unknown>, ...}` ou falha de Zod schema → retorna **redirect
permanente** para a mesma URL sem o param `after`:

```typescript
// Em src/app/parlamentares/[id]/page.tsx
function decodeCursor(token: string | undefined): CursorV1Payload | undefined {
  if (!token) return undefined
  try {
    const decoded = JSON.parse(atobUrlSafe(token))
    return CursorV1.parse(decoded)  // throws se v !== 1 ou shape diferente
  } catch {
    return null  // sentinel: trigger redirect
  }
}

// No page component:
const cursor = decodeCursor(searchParams.votos_after)
if (cursor === null) {
  permanentRedirect(`/parlamentares/${id}${stripVotosAfter(searchParams)}`)
  // 308 no App Router; equivalente a 301 para crawlers (RFC 7538)
}
```

**Por que redirect e não 404**: a URL externa (Google, WhatsApp) é válida em
forma — o que quebrou foi o contrato interno do token. 404 punindo o usuário
seria desonesto. Redirect para página 1 entrega conteúdo útil + sinaliza ao
crawler que a URL profunda foi consolidada.

**308 vs 301**: `permanentRedirect()` do `next/navigation` retorna 308 (RFC
7538), que crawlers tratam como equivalente a 301 para fins de re-indexação.
Caso futuro exija 301 literal, middleware Edge resolve sem mudança de contrato.

## Listas em escopo (Wave 7)

| Lista | Rota | ORDER BY (v1) | Payload do cursor |
|---|---|---|---|
| Votos recentes | `/parlamentares/[id]?votos_after=` | `data_hora DESC, voto_nominal_id DESC` | `{v:1, d:timestamp_ms, id:uuid}` |
| Proposições autor | `/parlamentares/[id]?propos_after=` | `ano DESC, numero DESC, proposicao_id DESC` | `{v:1, a:int, n:int, id:uuid}` |
| Gastos detalhe | `/parlamentares/[id]?gastos_after=` | `data_emissao DESC, gasto_id DESC` | `{v:1, d:timestamp_ms, id:uuid}` |

Schema Zod por lista vive em `src/lib/queries/cursor-schemas.ts` (novo
arquivo). Helper compartilhado `encodeCursor()/decodeCursor<T>()` em
`src/lib/cursor.ts` (novo arquivo).

## Listas fora de escopo

ADR-026 **não se aplica** a:

- **Listagem `/parlamentares`** — usa ordenação SSR + filtros; cardinalidade
  total (~513) cabe em página única com lazy-loading de imagens. Paginação
  só entra se cardinalidade subir (TSE, históricos pré-2023)
- **Home `/`** — peças sem multiplicidade
- **Header perfil** — peça sem multiplicidade
- **Afinidade Top 5** — cardinalidade fixa (5)
- **Top 3 categorias gastos / Top 5 fornecedores** — cardinalidade fixa
- **API `/api/export/parlamentares`** — CSV completo, sem paginação (consumo
  jornalista/pesquisador)

Esta lista é exaustiva. Adição requer extensão deste ADR ou ADR subsequente.

## Implicações de edge cache (ADR-018)

| Cenário | Cache hit ratio esperado | Justificativa |
|---|---|---|
| Página 1 (sem `?_after`) | ~95% | Quase 100% do tráfego entra por aqui |
| Página 2 | ~30% | Cauda longa; algum tráfego de jornalista/ativista |
| Páginas 3+ | < 10% | Tráfego marginal; aceitar cache miss |

Política de TTL herda do ADR-018 (mesma rota = mesmo `s-maxage`). Versionamento
do cursor não muda fingerprint da URL — o `after=` é tratado como qualquer
outro query param pelo Cloudflare Workers Cache.

**Custo Neon do redirect** (§5): redirect responde 308 sem query no banco —
cache miss não toca DB. Conformidade com CLAUDE.md §12 (banco scale-to-zero
é regra).

## Alternativas Consideradas

### A. Offset-based (`?page=N`)

- **Prós**: intuitivo, URL legível, paginação direta para N específico
- **Contras**:
  - **Drift em listas mutáveis**: inserts/deletes mid-session alteram o que
    "página 2" significa. Votos novos durante a sessão criam duplicação ou
    skip
  - **Cache key não-determinístico para mesma posição lógica**: ADR-018
    espera URL→conteúdo estável
  - **`OFFSET` no Postgres**: escala linearmente em `O(N)` — aceitável até
    20-30 páginas, mas listas pré-2023 podem ter milhares
- **Veredicto**: descartado pelos dois primeiros pontos. Performance é
  contraponto secundário

### B. Cursor exposto (`?after=2026-05-01T15:30:00Z`)

- **Prós**: URL human-readable, debug fácil
- **Contras**:
  - **Acopla URL ao schema interno**: mudança de `ORDER BY` quebra todas
    as URLs indexadas
  - **Sem tiebreaker visível**: empate em `data_hora` exige cursor
    composto, que explode a verbosidade
  - **Sem versionamento natural**: impossível evoluir
- **Veredicto**: descartado pelo acoplamento. Conveniência de debug não
  paga o lock-in

### C. Infinite scroll JS

- **Prós**: UX moderna em mobile, sem reload
- **Contras**:
  - **Requer `'use client'`** — quebra zero-JS no path anônimo (CLAUDE.md
    §princípios + ADR-018)
  - **Quebra scroll-restoration nativa**
  - **Crawlers Google indexam apenas a primeira tela** — URLs profundas
    deixam de existir como conteúdo indexável
  - **Quebra do botão "voltar" em mobile** — fricção crítica para persona P1
- **Veredicto**: descartado. UX moderna mascarando perda de SEO + a11y é
  custo desproporcional

### D. Cursor opaco **sem** versionamento

- **Prós**: 1 byte a menos por token
- **Contras**:
  - **Lock-in no schema atual**: mudança futura de `ORDER BY` quebra URLs
    indexadas silenciosamente (retornando dados off-by-N) ou força
    re-deploy com path novo (URLs morrem)
  - **Sem mecânica de upgrade** para v2 do cursor
- **Veredicto**: descartado. 1 byte de overhead compra liberdade de
  evolução perpétua. Trade-off trivialmente positivo

### E. Cursor opaco versionado (decisão atual)

- **Prós**: cobre todos os trade-offs acima sem perda significativa
- **Contras**:
  - URL menos legível (mas é opaca por design — feature, não bug)
  - Decoder + redirect adicionam ~30 linhas de código compartilhado em
    `src/lib/cursor.ts`
- **Veredicto**: **adotado**

## Consequências

### Positivas

- **URLs indexadas no Google sobrevivem mudanças internas** — versionamento
  + redirect 308 protege SEO contra refatoração futura de `ORDER BY`
- **Edge cache hit ratio alto na página 1** (~95%) — alinhamento ADR-018
  preservado
- **Zero JS no path de paginação** — `<a>` puro mantém zero-JS anônimo
- **Cardinalidade real visível** ao Cidadão Consciente — encerra a inflação
  silenciosa de completude da implementação atual
- **Jornalista ganha drill-down completo** sem precisar baixar CSV inteiro
  para uma investigação rápida

### Negativas

- **URLs menos legíveis** em logs, debugger, share copy — token opaco é mais
  difícil de inspecionar manualmente. Mitigação: helper `npm run cursor:decode
  <token>` em `scripts/` para devs
- **Sem "ir para página N"** — cursor não permite pular. Para 95% dos casos
  (Cidadão Consciente quer ver mais 20 votos) é irrelevante; para Jornalista
  com investigação profunda, o CSV via `/api/export` cobre
- **Manutenção adicional** se v2 for necessária — schema novo, decoder
  rotativo, plano de deprecação. Custo só pago quando o caso aparecer

### Neutras

- **Performance Postgres**: cursor `WHERE (data_hora, id) < (?, ?)` exige
  index composto. Para `voto_nominal` já existe `idx_voto_nominal_parlamentar_data`
  cobre — verificar EXPLAIN ANALYZE no Sprint 7.3 PR1
- **Light dormente** (ADR-024): irrelevante para esta decisão
- **Trust pyramid**: irrelevante; paginação é mecânica, não semântica de dado

## Referências

- [ADR-018 — Cache de edge na camada do app](018-cache-edge-app.md) — política
  de TTL e fingerprint de URL
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
  — princípio aplicado: cursor over offset por evidência (drift + cache)
- [`docs/features/PARLAMENTAR-360.md`](../../features/PARLAMENTAR-360.md) —
  spec de votações com filtros + paginação
- [RFC 7538 — HTTP 308 Permanent Redirect](https://datatracker.ietf.org/doc/html/rfc7538)
- [Next.js `permanentRedirect`](https://nextjs.org/docs/app/api-reference/functions/redirect#permanentredirect)
- [PostgreSQL — Range comparison for keyset pagination](https://www.postgresql.org/docs/current/queries-limit.html)
