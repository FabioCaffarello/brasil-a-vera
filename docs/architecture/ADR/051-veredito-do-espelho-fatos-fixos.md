# ADR-051: Veredito do Espelho — bloco de leitura rápida com fatos fixos

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-23
> Status: proposed

## Contexto

O perfil de parlamentar (`/parlamentares/[id]`) tem 15+ seções — uma
"sala de controle" desenhada para investigação. Mas o usuário primário
(Cidadão Consciente, mobile-first, chegando de uma crise nas redes) vem com
**uma pergunta de uma frase**: "este parlamentar me representa?". Encontra
excesso, não déficit, de dados — e, em mobile, sai. Falta uma **camada de
resposta acima da dobra**, em linguagem de cidadão.

A tentação óbvia é um bloco que destaque "os fatos mais salientes deste
parlamentar". **É exatamente a armadilha que o produto existe para evitar:** no
momento em que um algoritmo escolhe quais fatos sobem, embute-se um juízo
editorial sob aparência de neutralidade — e neutralidade falsa é pior que juízo
honesto, porque é não-auditável. Isso violaria a tese fundadora ("a plataforma é
o espelho, não o juiz") e a invariante de copy neutra do
[ADR-040 §4](040-alinhamento-orientacao-de-bloco.md) (sem score que ranqueie,
sem cor de juízo, contagem factual — "o cidadão conclui").

## Decisão

Adicionar um bloco "Em resumo" (Veredito do Espelho) no topo do perfil, com as
seguintes regras **invioláveis**:

1. **Quatro fatos FIXOS e idênticos para todos os parlamentares**, em ordem
   determinística: (1) alinhamento à orientação do partido; (2) gasto da cota
   parlamentar (CEAP) + percentil da casa; (3) proposições de autoria +
   percentil da casa; (4) pares de votos em sentidos opostos sobre o mesmo tema
   (coerência). A seleção **não depende do parlamentar** — não é "os mais
   relevantes deste".

2. **Frase factual, sem adjetivo-veredito.** Contagem e percentil; nunca
   "muito/pouco/bom/ruim", nunca "fidelidade/rebeldia/traição" (ADR-040 §4,
   retroativo). O percentil é **posição factual** na distribuição da casa, não
   juízo.

3. **Sem cor de juízo.** Números em token neutro (`text-fg-primary`); proibido
   verde=bom/vermelho=ruim. (O `TrustBadge` usa a cor do nível de confiança, que
   codifica L1–L4, não juízo do parlamentar.)

4. **Fallback honesto obrigatório por fato.** O item **nunca some** — em ausência
   de dado, vira frase honesta (omitir mudaria a lista por parlamentar = juízo
   disfarçado). Estados cobertos: federação (ADR-041 — "característica da fonte,
   não amostra insuficiente"); senador sem orientação (**dívida de ingestão
   #500**, conforme a Emenda 2026-06-20 do ADR-040 — **proibido** usar "o Senado
   não publica orientação", premissa falsificada); Câmara sem orientação ainda
   publicada; amostra < `ALINHAMENTO_AMOSTRA_MINIMA` (=50); sem CEAP; zero
   proposições; zero pares.

5. **Critério exposto na UI.** Microtexto fixo no rodapé do bloco: "Mostramos
   sempre os mesmos quatro fatos, na mesma ordem, para todos — não escolhemos 'os
   mais relevantes deste'" + link para `/docs/como-ler-um-perfil`.

6. **TrustBadge por fato** (todos L2 — agregação determinística).

7. **Lógica pura e testável.** A classificação (completo vs. cada fallback) vive
   em `src/modules/parlamentares/domain/leitura-rapida.ts`, sem IO, com testes
   por estado. **Zero query nova:** o bloco reusa dados já buscados no
   `Promise.all` da page.

## Alternativas Consideradas

### Alternativa A — fatos dinâmicos ("os mais salientes deste parlamentar")
- Selecionar, por parlamentar, os fatos mais distantes da mediana.
- Contras: é a "armadilha nº1" — escolher a narrativa = juízo editorial
  encoberto e não-auditável. **Rejeitada**; fixo é o que mantém o espelho.

### Alternativa B — substituir o StatGroup de 4 KPIs existente
- O bloco tomaria o lugar do StatGroup numérico do topo.
- Contras: regressão (perde a leitura numérica densa que o power-user usa) e
  risco de retrabalho. **Rejeitada**; o bloco **complementa** (frases acima,
  KPIs abaixo). Remoção/colapso do StatGroup fica como decisão futura dirigida
  por dado de uso (analytics, item 0 do plano de produto).

### Alternativa C — KPI cards em vez de prosa
- Repetir o padrão de cards numéricos.
- Contras: não responde "me representa?" em linguagem de cidadão (recria a "sala
  de controle"). **Rejeitada**; prosa factual é a camada de resposta.

## Consequências

### Positivas
- Camada de resposta acima da dobra, mobile-first, em linguagem de cidadão.
- Neutralidade **auditável**: a regra de seleção é uma constante versionada aqui,
  não uma decisão ad-hoc de PR.
- Zero custo de banco (reusa o render; nenhuma query nova).
- O diferencial do produto (coerência) ganha visibilidade — de forma factual.

### Negativas
- **Duplicação visual** com o StatGroup (mesmo alinhamento/gasto/proposições
  aparece em prosa e em KPI). Aceita nesta versão (representações diferentes:
  responder vs. escanear).
- **Câmara-cêntrico:** senadores veem mais fallbacks (alinhamento = dívida #500;
  sem CEAP). É honesto, mas a assimetria é visível no topo.
- Débito pré-existente exposto: as seções **existentes** de alinhamento ainda
  usam a frase "o Senado não publica orientação" (falsificada pela Emenda
  2026-06-20). Fora do escopo deste ADR; rastrear correção separada.

### Neutras
- A ordem e o conjunto dos 4 fatos podem ser revistos por ADR futuro **com
  evidência empírica de uso** (analytics) — não por preferência ad-hoc.

## Referências

- [ADR-040](040-alinhamento-orientacao-de-bloco.md) — invariante de copy neutra
  (§Decisão item 4) + Emenda 2026-06-20 (Senado = dívida #500, não "não publica").
- [ADR-041] — alinhamento por federação como característica da fonte.
- `docs/architecture/TRUST-PYRAMID.md` — níveis de confiança L1–L4.
- `docs/product/PRODUCT-VISION.md` — "a plataforma é o espelho, não o juiz".
- `src/app/docs/como-ler-um-perfil` — metodologia pública (linkada no bloco).
- Issues #500 (orientação do Senado), #480 (cobertura por federação).
- Implementação: `src/components/parlamentar/leitura-rapida.tsx`,
  `src/modules/parlamentares/domain/leitura-rapida.ts`.
