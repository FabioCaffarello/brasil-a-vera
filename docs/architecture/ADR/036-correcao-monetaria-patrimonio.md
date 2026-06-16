# ADR-036: Correção monetária do patrimônio declarado (Eixo 2)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-16
> Status: **accepted**. Opção **(b), IPCA com data-base fixa** (owner,
> 2026-06-15). Série e data-base confirmadas empiricamente na API do SIDRA em
> 2026-06-16 (princípio 13) — ver §Decisão e §Referências.

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
4. **Índice:** IPCA **número-índice** do IBGE, **SIDRA tabela 1737, variável
   2266** (*"IPCA - Número-índice (base: dezembro de 1993 = 100)"*),
   nível Brasil, série mensal. Escolhemos o **número-índice** (não a variação %)
   porque deflacionar é a razão entre dois meses — `V_base = V_mês × (I_base /
   I_mês)` — determinística e sem composição de taxas. A série é **vendorada
   como tabela de referência estática** versionada no repo (uma linha por mês,
   pequena; sem fetch em request-time). A materialização da tabela acompanha o
   incremento que a consome (Camadas B/C) — não criada agora (sem consumidor).
5. **Data-base fixa: dezembro de 2022** (número-índice **6474.09**). É o
   pleito mais recente coberto; tudo passa a ser expresso "a preços de
   dez/2022". Para a Camada A (snapshot nominal) é inócua; serve às Camadas
   B/C (comparação entre pleitos). **Travada aqui**: re-basear — p.ex. ao
   ingerir a eleição de 2026 — exige **novo ADR** (regra de imutabilidade), o
   que é apropriado porque adicionar um pleito já é mudança significativa.

> Valores de referência confirmados no SIDRA (2026-06-16), p/ sanidade da
> deflação futura: dez/2022 = 6474.09 (base) · out/2018 = 5103.69 · out/2014
> = 4008.00. Ex.: bem declarado em out/2018 → preços de dez/2022 = ×(6474.09 /
> 5103.69) ≈ ×1,269 (≈ +27% de IPCA acumulado no período).
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
- IBGE / SIDRA — IPCA número-índice, tabela 1737, variável 2266:
  `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/all`
  (confirmado 2026-06-16: dez/2022 = 6474.09; último disponível maio/2026 = 7640.15)
