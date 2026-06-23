# ADR-054: Card de fato compartilhável — par de votos em direções opostas

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-23
> Status: accepted

## Contexto

O perfil de parlamentar já tem uma dobra de resposta (Veredito do Espelho,
[ADR-051](051-veredito-do-espelho-fatos-fixos.md)) e um card OpenGraph que, ao ser
compartilhado, representa **a página** — a pessoa inteira. Mas o gatilho real de
compartilhamento cívico não é "a página"; é **um fato**: o cidadão vê algo e quer
mostrar *aquilo*. O artefato (card de perfil) está desalinhado do gatilho (um fato).

Esta decisão alinha o artefato ao gatilho **para um único tipo de fato**: o par de
votos em direções opostas sobre o mesmo tema (a feature de coerência,
`getParesContraditorios`). Um tipo por rodada, um sinal de UTM limpo. Os outros três
fatos do Veredito (alinhamento, gasto, proposições) **não** viram card agora.

Duas forças moldam a decisão:

1. **Reversão de uma sub-decisão documentada.** O OG do perfil
   (`src/app/parlamentares/[id]/opengraph-image.tsx`) *deliberadamente* deixou a
   coerência de fora, com a justificativa literal: *"Coerência NÃO entra (decisão de
   produto: o fato mais descontextualizável + query não-cacheada)"*. Transformar
   justamente esse fato em card exige enfrentar os dois motivos de frente.

2. **Neutralidade ([ADR-051](051-veredito-do-espelho-fatos-fixos.md) +
   [ADR-040 §4](040-alinhamento-orientacao-de-bloco.md)).** Uma superfície
   compartilhável nova é uma superfície de juízo em potencial. A regra fundadora
   ("a plataforma é o espelho, não o juiz") tem que valer *dentro da imagem*, que
   viaja sem o contexto da página.

## Decisão

Criar um **card de fato por par contraditório**, com uma rota dedicada que serve
tanto a imagem OG quanto uma página-fato de aterrissagem:
`/parlamentares/[id]/contradicao/[voto1]/[voto2]`.

### 1. Regra de seleção (conforma ADR-051 regra 1 — não reabre)

- **O cidadão escolhe** qual par compartilhar. Há **uma afordância por par** na
  seção de pares do perfil; o clique é a seleção. A plataforma **não** elege "o par
  mais notável".
- A URL **encoda o par específico pelos dois `votacaoId`** (`voto1` + `voto2`), como
  segmentos de path — porque a convenção `opengraph-image.tsx` do Next recebe apenas
  `params`, nunca `searchParams` (ver Alternativa A).
- Se um default determinístico for necessário, é o **primeiro da ordem existente** —
  o mais recente por data (`src/lib/queries/coerencia.ts` já ordena por
  `max(data1, data2)`). Recência é fato.
- **Proibido re-ranquear por "mais contraditório / maior divergência".** Isso
  reabriria a porta algorítmica que o ADR-051 (regra 1) fechou: escolher a narrativa
  é juízo editorial encoberto.

### 2. Invariantes de neutralidade (dentro da imagem)

- O card afirma um fato **L1/L2** com número e descrição **factuais**: data, referência
  da proposição, direção (Restritiva/Permissiva), o voto (SIM/NÃO) de cada lado, dias
  entre os votos, e o tema em comum.
- **Fonte + `trust_level` (L2) ficam DENTRO da imagem.** (Diferente do OG de perfil,
  que os omite — aqui são exigidos pelo teste do print.)
- **Nunca** adjetivo-veredito ("incoerente", "fidelidade", "rebeldia", "traição",
  "muito/pouco/bom/ruim"). A copy visível espelha o vocabulário neutro já em uso na
  página: **"votos em direções opostas sobre o mesmo tema"**. O termo "contradição"
  permanece apenas como *slug de URL / nome interno*, nunca como copy voltada ao
  cidadão.
- **Sem cor de juízo.** No card OG, os rótulos de direção usam **tom neutro (cinza)**,
  não os tons error/success que a página usa — porque, recortado o contexto, vermelho
  lê como "ruim" e verde como "bom" (ADR-040 §4). A página mantém seus tons (tem o
  disclaimer e o contexto ao redor); a imagem viajante, não.
- **Teste do print:** cortado o contexto da página, o fato segue verdadeiro porque o
  contexto está embutido na própria imagem.

### 3. Reversão da exclusão de coerência do card

A exclusão original tinha dois motivos, ambos endereçados:

- *"O fato mais descontextualizável"* — o motivo era válido **para um card-resumo da
  página**, que mostraria a coerência sem o par. Um **card por-par** carrega o par
  inteiro (ambas as votações, datas, tema, fonte) — o contexto deixa de ser externo.
  O teste do print (item 2) é a salvaguarda.
- *"Query não-cacheada"* — corrigido na fonte: `getParesContraditorios` ganha um
  wrapper `cached()` (`TTL.coerenciaPares`, 6h — coerência só muda com nova ingestão
  de votação, cron diário), satisfazendo a disciplina de custo Neon (princípio 8/12).
  Endpoints OG são martelados por scrapers; cache + `cache-control` na resposta são
  obrigatórios.

### 4. Medição (UTM dual)

O sinal de sucesso é tráfego de retorno comparável **card-de-par vs card-de-perfil**.
Para isso, `buildShareUrl` ganha um parâmetro opcional de campanha: o card de par usa
`utm_campaign=par-contraditorio`; o botão de compartilhar do perfil passa a usar
`utm_campaign=perfil`. Os demais UTM (`utm_source` por canal, `utm_medium=share`)
permanecem.

## Alternativas Consideradas

### Alternativa A — codar o par em `searchParams` do perfil, sem rota nova
- Compartilhar `/parlamentares/[id]?par=v1_v2` e trocar o OG no `generateMetadata`.
- Contras: (1) a convenção `opengraph-image.tsx` **não recebe `searchParams`**, só
  `params` — a imagem do par teria que ser uma rota à parte de qualquer jeito; (2)
  ler `searchParams` no `generateMetadata` do perfil **forçaria a página de detalhe
  (hoje SSG, princípio 9) a render dinâmico** — regressão de custo/perf na rota mais
  quente. **Rejeitada**; a rota dedicada isola a superfície dinâmica/cacheada do par.

### Alternativa B — página-fato sem imagem OG
- Criar a aterrissagem do par, mas sem card visual; o preview de link cairia no OG
  do perfil/site.
- Contras: anula o objetivo — o gatilho é justamente o **artefato visual** do fato.
  **Rejeitada.**

### Alternativa C — a plataforma elege o "par mais notável"
- Auto-selecionar o par de maior divergência para o card.
- Contras: algorítmico; viola ADR-051 regra 1 (juízo editorial encoberto).
  **Rejeitada** — o cidadão escolhe; o default, quando preciso, é recência (fato).

## Consequências

### Positivas
- O artefato compartilhável passa a casar com o gatilho (um fato), com um sinal de
  UTM segmentável que prova (ou não) a hipótese.
- A exclusão de coerência do card deixa de ser implícita: vira decisão auditável,
  com a mitigação (contexto-na-imagem + cache) registrada.
- Ganho de custo colateral: `getParesContraditorios` finalmente cacheado — usado
  também pelo perfil.

### Negativas
- **Nova superfície navegável** (`/contradicao/...`) por par — marcada `noindex` e
  fora do sitemap (é landing de share, não conteúdo canônico; o canônico é o perfil).
- **Mais client islands** na seção de pares do perfil (uma afordância de compartilhar
  por par). O perfil já não é zero-JS (tem o dialog de compartilhar); a adição é
  consistente, mas aumenta o JS dessa seção.
- Toca comportamento existente: o botão de compartilhar do perfil passa a emitir
  `utm_campaign=perfil` (necessário para a comparação).

### Neutras
- O conjunto "só pares contraditórios" é desta rodada. Os outros três fatos como card
  ficam para ADRs/PRs futuros, **um tipo por vez**, para não sujar a leitura de UTM.

## Referências

- [ADR-051](051-veredito-do-espelho-fatos-fixos.md) — Veredito do Espelho; regra 1
  (seleção não-algorítmica), regras 2/3 (copy factual, sem cor de juízo).
- [ADR-040 §4](040-alinhamento-orientacao-de-bloco.md) — invariante de copy neutra.
- [ADR-026](026-paginacao-cursor-ssr.md) — paginação por cursor (contexto da rodada).
- [ADR-018](018-cache-edge-app.md) — cache de edge; `cached()` + TTL.
- Implementação: `src/app/parlamentares/[id]/contradicao/[voto1]/[voto2]/`
  (page + opengraph-image), `src/lib/queries/coerencia.ts`, `src/lib/share-url.ts`,
  `src/components/parlamentar/{compartilhar-button,pares-contraditorios}.tsx`,
  `src/lib/og/chrome.tsx`.
- `docs/product/PRODUCT-VISION.md` — "a plataforma é o espelho, não o juiz".
