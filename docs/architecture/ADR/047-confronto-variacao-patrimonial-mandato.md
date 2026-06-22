# ADR-047: Confronto de variação patrimonial real durante o mandato (percentil vs pares)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-22
> Status: proposed

> Confronto do eixo patrimônio (Eixo 2), sobre a trajetória da Camada B
> ([ADR-036](036-correcao-monetaria-patrimonio.md) — correção IPCA). Reusa a
> moldura de copy neutra do [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4
> e o padrão fail-closed.

## Contexto

A Camada B do Eixo 2 já mostra a **trajetória patrimonial** de cada parlamentar
entre os pleitos em que se candidatou, com valores **corrigidos por IPCA**
([ADR-036](036-correcao-monetaria-patrimonio.md)): `buildEvolucao` produz
`deltaCorrigido` (variação real) e `deltaPct` por par de pleitos consecutivos.

O que falta é o **enquadramento de accountability comparativo**: a evolução é
exibida per-parlamentar, mas não diz **como essa variação se compara à dos
pares**. "O patrimônio cresceu X% real durante o mandato" ganha sentido cívico
quando vira "cresceu mais que P% dos colegas da casa".

**Diagnóstico empírico (2026-06-22, princípio 13)** — medição contra o Postgres
local (Neon em 402; reconfirmar, **[A CONFIRMAR]**):

| Achado | Medição |
| --- | --- |
| Parlamentares com **≥2 pleitos** de bens (variação computável) | **372** (179 com 2, 193 com 3) |
| Pares com pontos 2018 **e** 2022 | 362 |
| Cresceram **>50% nominal** entre 2018→2022 | **36%** (variância alta) |
| Deltas **reais** (IPCA) | já computados por `buildEvolucao` (`deltaCorrigido`, `deltaPct`) |

Não há fonte nova nem ingestão: a variação real já existe; o confronto é a
**camada comparativa** (percentil) sobre ela.

## Decisão

### D1 — Métrica: variação patrimonial real durante o mandato + percentil

- **Variação real** = diferença entre o patrimônio declarado **corrigido por
  IPCA** ([ADR-036](036-correcao-monetaria-patrimonio.md)) do **último par de
  pleitos consecutivos** em que o parlamentar declarou bens (ex.: 2018→2022 ≈ o
  mandato 2019–2022). Exibir o **delta real absoluto (R$)** e o **delta %**.
- **Percentil vs pares** = posição do parlamentar entre os que têm o **mesmo par
  de pleitos** e a **mesma casa**, para comparar maçãs com maçãs.
- **Fail-closed:** < 2 pleitos de bens → sem confronto (mesmo comportamento da
  Camada B); Senado nunca vincula (sem CPF → sem ponte TSE), a seção some.

### D2 — Percentil pelo delta real ABSOLUTO, não pelo %

O percentil é rankeado pelo **delta real em R$**, não pelo %: uma base pequena
infla o % (R$ 10 mil → R$ 100 mil = +900%) e distorceria o ranking. O **%** é
exibido junto, com a ressalva de que reflete a base. Determinístico (mesmo
critério do `percentil_gasto_casa` já existente).

### D3 — Copy neutra e honesta sobre a fonte (estende ADR-040 §4)

- Termo factual: **"patrimônio declarado variou R$ X (Y% real) no período;
  percentil P entre os pares"**. **Proibido** "enriquecimento ilícito",
  "enriqueceu suspeito" ou qualquer juízo de ilicitude.
- **Nota de fonte obrigatória:** é a **declaração de bens à Justiça Eleitoral**
  na candidatura — não é renda, movimentação bancária nem patrimônio real-time;
  reflete o que foi declarado em cada eleição.
- Sem score agregado que ranqueie nominalmente parlamentares numa lista pública
  de "mais enriqueceram" (o percentil é contextual ao perfil, não um ranking).

### D4 — Distinção de "gastos" (CEAP)

Patrimônio (bens declarados ao TSE) ≠ gastos da cota (CEAP, custeio
operacional). Rótulos e seções distintos; nunca somar/confundir os dois.

## Alternativas Consideradas

> Decisões fechadas pelo owner.

### Alternativa A — percentil pelo % de crescimento
- **Descartada (D2):** bases pequenas inflam o % e dominam o topo do ranking.

### Alternativa B — comparar contra 2014 fixo (não o último par)
- **Descartada:** o confronto é "durante o mandato"; o último par de pleitos
  consecutivos é o que cobre o mandato corrente/mais recente. Pares antigos viram
  contexto, não a manchete.

### Alternativa C — materializar numa tabela agregada (como percentil_gasto_casa)
- **Adiada:** o universo é pequeno (~372 parlamentares); calcular o ranking
  on-the-fly (cacheado 24h) evita schema/seed novos. Materializar fica para
  quando houver gargalo provado (ADR-019).

## Consequências

### Positivas
- Sharpeniza a Camada B num confronto comparativo de alto interesse cívico, sem
  fonte nova, sem ingestão, sem schema — só uma camada de cálculo sobre dado
  existente.
- Reusa a correção IPCA do ADR-036; o percentil reusa o critério do
  `percentil_gasto_casa`.

### Negativas
- **Cobertura desigual:** só parlamentares com ≥2 pleitos têm o confronto;
  Câmara-only na prática (Senado sem CPF). Documentado.
- **Granularidade de eleição:** a variação é medida entre declarações de
  campanha (a cada 4 anos), não anual — não capta movimentações intra-mandato.
- **Declaração ≠ patrimônio real:** subdeclaração/critérios de avaliação são
  conhecidos; a copy explicita que é a declaração ao TSE.

### Neutras
- Sem tabela nova; cálculo do ranking on-the-fly cacheado (ADR-018).

## Classificação na Pirâmide de Confiança

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Bem declarado / total por pleito | **L1** | Bruto do TSE, com link. |
| Variação real (IPCA) entre pleitos | **L2** | Agregação determinística com fórmula pública (ADR-036). |
| Percentil vs pares (mesma casa/par de pleitos) | **L2** | Ranking determinístico sobre L2. |

Nenhum dado é L3/L4: sem inferência nem juízo; a variação e o percentil são
deterministicamente reproduzíveis.

## Não-objetivos (fora de escopo)

- **Doações de campanha / financiamento** (não ingeridas).
- **Renda, movimentação bancária, patrimônio real-time** — só a declaração TSE.
- **Senado** (sem CPF → sem ponte TSE).
- **Juízo de ilicitude / "enriquecimento ilícito"** (D3).
- **Ranking público nominal** de "quem mais enriqueceu" (D3 — o percentil é
  contextual ao perfil).
- **UI** — este PR entrega ADR + camada de dados; a UI no perfil é incremento
  seguinte.
- **Afirmações de número** antes de reconfirmar contra prod (DB local; Neon 402).

## Referências

- [ADR-036](036-correcao-monetaria-patrimonio.md) — correção monetária IPCA da
  trajetória patrimonial.
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- Diagnóstico empírico (2026-06-22): 372 parlamentares com ≥2 pleitos; 36% com
  crescimento nominal > 50% entre 2018→2022.
- Domínio reusado: `src/modules/eleitoral/domain/ipca.ts` (`corrigirParaBase`),
  `evolucao.ts` (`buildEvolucao`).
