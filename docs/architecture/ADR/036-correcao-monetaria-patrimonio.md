# ADR-036: Correção monetária do patrimônio declarado (Eixo 2)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-15
> Status: **proposed** — esqueleto. Decisão de alto nível travada (owner,
> 2026-06-15): **opção (b), IPCA com data-base fixa**. Pendências de validação
> empírica (série, data-base, fonte) marcadas como `[A CONFIRMAR]` antes de
> mudar status para `accepted` (princípio 13).

---

## Contexto

O [Eixo 2 — Trilha Patrimonial](../../product/EIXO-2-PATRIMONIO.md) compara o
patrimônio declarado de um parlamentar entre pleitos (Camadas B e C). O dado
bruto do TSE é **valor nominal** declarado por candidatura, em anos eleitorais
discretos (restrições R1 e R2 do mapa do Eixo 2).

Comparar valores nominais de pleitos distantes (ex.: 2014 vs 2022) sem correção
mistura **crescimento patrimonial real** com **inflação acumulada** (IPCA
acumulado no período supera ~70%). Uma "evolução" não corrigida engana mais do
que informa. A decisão de correção monetária é, portanto, pré-condição para que
a Camada B exista de forma honesta.

Forças em jogo:
- **Invariantes do Eixo 2:** determinístico, sem IA, custo runtime ~zero
  (materializado em batch).
- **Trust Pyramid:** correção monetária transforma um valor L1 (bruto) num
  derivado; precisa ser reproduzível para ser L2 (e não L4).
- **Honestidade editorial:** qualquer escolha de índice/data-base é uma decisão
  com viés; tem de estar documentada e visível ao leitor.

## Decisão

**Opção (b): correção pelo IPCA com data-base fixa travada neste ADR.**

1. O **valor nominal permanece armazenado** como substrato bruto (L1), com
   `source_url` + `ingested_at`. Nenhuma correção sobrescreve o nominal.
2. O **valor corrigido por IPCA** é coluna/visão **derivada** materializada em
   batch, classificada **L2** (agregação determinística reproduzível, com
   `formula_url` apontando para a fórmula no repositório).
3. O corrigido é o **default** das comparações inter-pleito (Camadas B e
   rótulos da C); o nominal permanece acessível como substrato.
4. **Índice:** IPCA, série oficial do IBGE `[A CONFIRMAR: tabela SIDRA exata]`,
   **vendorada como tabela de referência estática** versionada no repo (série
   pequena, determinística; sem fetch em request-time).
5. **Data-base fixa:** `[A CONFIRMAR — recomendação: dezembro do ano da
   eleição mais recente coberta]`. Travada aqui; mudá-la é novo ADR (regra de
   imutabilidade).
6. **Materialização:** deflacionamento calculado no batch de ingestão/derivação
   (GitHub Actions → Postgres). Zero cálculo em request-time.

> A escolha de (b) sobre (c) foi do owner: "user-configurable" tensiona o custo
> ~zero (exigiria pré-materializar 2 colunas, virando (b) + toggle). O ADR-âncora
> e o default permanecem (b); um toggle nominal↔corrigido é evolução opcional,
> não 3ª via.

## Alternativas Consideradas

### Alternativa A — Só nominal, com aviso
- Mais barato; valor permanece sempre L1, sem índice vendorado.
- **Contra:** esvazia as Camadas B/C — a "evolução" inter-pleito vira
  majoritariamente ruído inflacionário. Entrega diligência que engana.

### Alternativa B — IPCA, data-base fixa no ADR `(ESCOLHIDA)`
- Determinístico, batch, custo zero; honesto se data-base e fonte documentados.
- Nominal preservado como L1; corrigido é L2 derivado e default.
- **Contra:** assume IPCA como deflator "neutro" (escolha com viés, mitigada por
  documentação visível); índice precisa de manutenção anual (1 linha/ano).

### Alternativa C — Ambos lado a lado, user-configurable
- Máxima flexibilidade ao leitor.
- **Contra:** "configurável" tensiona o custo ~zero; na prática exige
  pré-materializar nominal **e** corrigido — ou seja, (b) + um toggle. Não é uma
  via genuinamente distinta; o ADR-âncora ainda teria de ser (b).

## Consequências

### Positivas
- Camada B torna-se honesta (separa crescimento real de inflação).
- Derivado permanece **L2** (reproduzível), não cai para L4.
- Nominal nunca é perdido; auditável contra a fonte TSE.
- Camada C (mix) é **imune** a esta decisão (share intra-pleito é inflação-neutro).

### Negativas
- Assume IPCA como deflator de referência — escolha com viés; exige disclaimer
  visível de "valores corrigidos a preços de `[data-base]` pelo IPCA/IBGE".
- Tabela de índice precisa de atualização anual (operação mínima).
- Duas representações do mesmo valor (nominal/corrigido) na UI exigem rótulo
  inequívoco para não confundir o leitor.

### Neutras
- Substrato nominal coexiste com o corrigido no schema (uma coluna derivada a
  mais por valor agregado).

## Referências

- [Eixo 2 — Trilha Patrimonial](../../product/EIXO-2-PATRIMONIO.md) §6 e §7
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) (L1/L2)
- Princípio 13 do CLAUDE.md (validação empírica antes de `accepted`)
- IBGE / SIDRA — série IPCA `[A CONFIRMAR]`
