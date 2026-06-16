# Eixo 2 — Trilha Patrimonial

> Brasil a Vera · Produto · v0.1 (mapa de planejamento)
> Última atualização: 2026-06-15
> Status: **planejamento** — nenhum código, schema ou migration escrito.
> Pré-requisito não satisfeito hoje (ver §3). Decisões travadas: correção
> monetária = ADR-036 opção (b); ingestão entra como Incremento 0.

---

## Sumário

- [1. Propósito e enquadramento](#1-propósito-e-enquadramento)
- [2. Invariantes (não negociáveis)](#2-invariantes-não-negociáveis)
- [3. Fonte única e o estado real do dado](#3-fonte-única-e-o-estado-real-do-dado)
- [4. Restrições do dado bruto](#4-restrições-do-dado-bruto)
- [5. As quatro camadas](#5-as-quatro-camadas)
- [6. Checkpoint de correção monetária](#6-checkpoint-de-correção-monetária)
- [7. Classificação Trust Pyramid](#7-classificação-trust-pyramid)
- [8. Incrementos e sequência](#8-incrementos-e-sequência)
- [9. Fronteiras explícitas (fora de escopo)](#9-fronteiras-explícitas-fora-de-escopo)
- [10. ADRs e referências](#10-adrs-e-referências)

---

## 1. Propósito e enquadramento

A **Trilha Patrimonial** é o primeiro incremento concreto de uma camada nova de
produto: **diligência política**. Diligência aqui significa **confronto
factual** — colocar lado a lado o que o sujeito político declarou, ao longo do
tempo, e deixar o leitor ver — **não** agregação editorializada nem score.

O produto hoje opera no triúnviro cívico (parlamentar = coerência; proposição =
ciclo de vida; votação = tensão coletiva). A diligência política é uma camada
**ortogonal** a esses eixos narrativos: o sujeito-político continua no centro,
mas o material é a sua **declaração de bens**, não o seu comportamento
legislativo.

Esta é a **Trilha** (Eixo 2). O grafo de participação societária (Camada D) é a
**ponte** para um futuro **Eixo 3** (rede de interesses) e é planejado como
incremento separado e posterior.

## 2. Invariantes (não negociáveis)

Herdadas do brief e travadas para todas as quatro camadas:

1. **Determinístico.** Mesmo input → mesmo output. Toda fórmula é auditável no
   repositório.
2. **Sem score de IA.** Nenhuma classificação, embedding ou inferência por
   modelo. Regex/lookup determinístico é permitido; resolução fuzzy de entidade
   **não** é (relevante na Camada D — ver §5.D).
3. **Sujeito-político no centro.** A unidade de navegação é o parlamentar. A
   empresa (Camada D) é nó, mas a ancoragem narrativa permanece no parlamentar.
4. **Custo runtime ~zero.** Tudo materializado em batch (GitHub Actions →
   Postgres). Nada de cálculo em request-time. Páginas de detalhe via SSG +
   `revalidate` (princípios 8–9 e 12 do CLAUDE.md; ADR-018).

A **fonte é única**: declaração de bens do TSE. **Não expandir fontes.**

## 3. Fonte única e o estado real do dado

> ⚠️ **Achado bloqueante registrado (2026-06-15).** O brief assumiu o dataset
> `bem_candidato` **já ingerido**. Auditoria do repositório falsificou isso:

| Item | Estado real |
|---|---|
| Tabela de bens declarados (`bem_candidato` ou equiv.) | **não existe** — nem modelada no `DATA-DICTIONARY.md` |
| Diretório `ingestion/tse/` | não existe |
| Entradas TSE em `ingestion/registry.ts` | zero (11 fontes, todas Câmara/Senado) |
| Módulo `src/modules/eleitoral/` | não existe |
| Tabelas `candidatura` / `doacao` | documentadas como **planejadas**, não implementadas |
| Ponte parlamentar↔candidato | só o campo `parlamentar.cpf` (nullable); lógica de vínculo inexistente |

Referências: `docs/architecture/DATA-SOURCES.md:99-123` (bens listados como
*planejado*, Wave 2, que fechou sem TSE); `docs/product/ROADMAP.md:444`
("TSE inicial subset 2022" — Wave 3.3 **pausada em 2026-05-15**).

**Decisão (owner, 2026-06-15):** a ingestão TSE de bens + a modelagem da tabela
raiz L1 + a ponte CPF→parlamentar entram como **Incremento 0**, pré-requisito
das Camadas A→D (ver §8). A fonte permanece única; Incremento 0 é a *condição*
para a fonte existir, não uma expansão de fontes.

### 3.1 O que é o dataset (perfil esperado, a confirmar na ingestão)

Declaração de bens do TSE (`dadosabertos.tse.jus.br`, CSV/ZIP por ano
eleitoral). Granularidade: **um registro por bem declarado por candidatura**.
Campos esperados (nomenclatura TSE a confirmar no Incremento 0): ano da eleição,
identificação do candidato (sequencial TSE; CPF quando disponível), **código +
descrição do tipo de bem**, **descrição livre do bem**, **valor nominal
declarado**. A confirmação dos nomes de coluna é tarefa empírica do Incremento 0
(princípio 13 — output literal no PR).

## 4. Restrições do dado bruto

Encaradas de frente; cada camada declara como respeita estas restrições.

- **R1 — Pontos discretos, nunca série contínua.** Bens são declarados *por
  candidatura* (anos eleitorais), não continuamente. O patrimônio entre dois
  pleitos é **desconhecido**, não constante. Toda visualização representa pontos
  discretos. **Lacuna ≠ zero**: ano eleitoral sem declaração é *desconhecido*,
  jamais renderizado como R$ 0 nem interpolado.
- **R2 — Valores nominais.** Comparar pleitos exige decisão explícita de correção
  monetária (resolvida em §6 / ADR-036).
- **R3 — Descrição é texto livre.** **Não rastrear bens individuais entre
  pleitos** (não há chave estável de bem). Agregação é sempre **por categoria**.
- **R4 — Vínculo candidato↔parlamentar é imperfeito.** Não há ID compartilhado
  TSE↔Câmara/Senado. CPF exato quando disponível; heurística nome+partido+UF
  caso contrário. O método do vínculo **rebaixa a confiança** do que dele depende
  (ver §7).

## 5. As quatro camadas

Ordem de prioridade: **A → B → C** (Incremento 1), **D** (Incremento 2).

### Camada A — Snapshot patrimonial

- **O que é:** total declarado + composição por categoria da **última**
  candidatura disponível do parlamentar. Um único ponto no tempo.
- **Dado derivado:** valores individuais por bem (raw); `total_declarado`
  (SUM); `pct_por_categoria` (composição %).
- **Fronteira de invariante:** o mais próximo de bruto. Sem correção monetária
  (ponto único), sem comparação. Respeita R3 (agrega por categoria). Determinístico.
- **Nota de trust (correção honesta ao brief):** o brief rotulou Camada A como
  "L1 puro". Pelo critério canônico do projeto (`src/shared/trust/types.ts`),
  **valores individuais são L1**, mas `total` e `composição %` são **agregações
  → L2**. Não há L1 "puro" assim que se soma. Ver §7.
- **Depende de:** Incremento 0. **Não** depende do ADR-036.

### Camada B — Evolução entre pleitos

- **O que é:** variação do patrimônio por categoria entre candidaturas
  sucessivas **disponíveis**. Pontos discretos explicitamente marcados.
- **Dado derivado:** `delta_por_categoria` entre pleitos consecutivos; total
  por pleito; ambos em versão **nominal** (L1-substrato) e **corrigida por IPCA**
  (default de comparação).
- **Fronteira de invariante:** aqui mora R1 e R2. Delta calculado **só entre
  declarações que existem** — nunca preenche ano sem declaração. A correção
  monetária é o ponto onde o dado deixa de ser bruto (rebaixamento L1→L2).
  Determinístico (IPCA = índice oficial + data-base fixa, ADR-036).
- **Depende de:** Incremento 0 + **ADR-036** (correção monetária).

### Camada C — Mudança de mix de composição

- **O que é:** como a *proporção* entre categorias muda ao longo dos pleitos
  (ex.: imóveis 70%→40%, quotas de empresa 10%→45%).
- **Dado derivado:** série discreta de `pct_por_categoria` por pleito;
  `delta_mix` entre pleitos.
- **Fronteira de invariante:** **propriedade notável — C é imune ao ADR-036.**
  Composição é share-of-total *dentro de cada pleito*, logo neutra à inflação:
  o mix não muda se você deflaciona todos os bens de um mesmo ano pelo mesmo
  fator. C entrega leitura honesta de "para onde o patrimônio migrou" sem
  depender da escolha de correção monetária. Determinístico.
- **Depende de:** Incremento 0. **Não** depende do ADR-036.

### Camada D — Grafo parlamentar ↔ empresa (participação societária)

- **O que é:** grafo com parlamentar e **CNPJ como nós**, arestas =
  participação societária declarada (quotas/ações) num pleito, com valor e ano.
  Caso de uso do ReactFlow (issue #96; ainda não é dependência). Ponte para o
  Eixo 3.
- **Dado derivado:** nó-empresa extraído da **descrição livre** dos bens de
  categoria "participação societária / quotas / ações"; aresta
  (parlamentar→empresa, valor, ano, pleito).
- **Fronteira de invariante — a mais tensionada:** extrair CNPJ/empresa de
  texto livre cruza o limite do invariante 2. **Permitido:** extração
  determinística (regex de CNPJ, normalização de string). **Proibido:**
  resolução fuzzy de entidade / casamento por similaridade / qualquer modelo.
  Onde a empresa só aparece como nome livre sem CNPJ, o nó é **não-resolvido** e
  marcado como tal — nunca fundido por heurística. Isto **rebaixa D para L3**
  (ver §7) e exige disclaimer permanente. R3 também vale: não se rastreia a
  *cota individual* entre pleitos, só a existência do vínculo declarado.
- **Depende de:** Incremento 0 + Camadas A–C estáveis. Planejado como
  **Incremento 2, separado e posterior.** ADR-037 (skeleton) modela nós/arestas.

## 6. Checkpoint de correção monetária

**Resolvido (owner, 2026-06-15): opção (b) — IPCA com data-base fixa travada em
ADR.** Detalhamento e alternativas em **[ADR-036](../architecture/ADR/036-correcao-monetaria-patrimonio.md)**.

Espinha da decisão:
- O **valor nominal permanece armazenado** como substrato bruto (L1).
- O **valor corrigido por IPCA** é a *view* derivada (L2) e o **default** das
  comparações inter-pleito (Camadas B/C-rótulos).
- Data-base e série do índice (IBGE/SIDRA) **travadas no ADR**; índice vendorado
  como tabela de referência estática (série pequena, determinística).
- Encaixa as invariantes: determinístico, materializável em batch, custo zero.

## 7. Classificação Trust Pyramid

Vocabulário canônico (`src/shared/trust/types.ts`,
`docs/architecture/TRUST-PYRAMID.md`): **L1** bruto sem transformação · **L2**
agregação/cruzamento determinístico e reproduzível (com `formula_url`) · **L3**
correlação/inferência (disclaimer permanente, isolada visualmente) · **L4**
impacto/estimativa externa. O "L1-derivado" do brief corresponde ao **L2**
canônico.

| Camada | Dado derivado | Trust | Por quê / onde rebaixa |
|---|---|---|---|
| Inc. 0 | Linha de bem (valor nominal, descrição, tipo, ano) | **L1** | bruto do TSE, com `source_url` + `ingested_at` |
| Inc. 0 | Vínculo candidatura↔parlamentar **por CPF exato** | **L2** | cruzamento determinístico reproduzível |
| Inc. 0 | Vínculo **por heurística nome+partido+UF** | **L3** | inferência falível — disclaimer + flag de método (R4) |
| Inc. 0 | Re-bucketização de categorias TSE → categorias BaV | **L2** | mapeamento determinístico publicado |
| **A** | Valor de bem individual | **L1** | bruto |
| **A** | `total_declarado`, `pct_por_categoria` (1 pleito) | **L2** | **agregação** — não é "L1 puro" (correção ao brief) |
| **B** | `delta_por_categoria` **nominal** entre pleitos | **L2** | agregação determinística sobre L1 |
| **B** | `delta`/total **corrigido por IPCA** | **L2** | ⬇️ **rebaixa de L1→L2**: cruza índice IBGE (ADR-036) |
| **C** | `pct_por_categoria` por pleito + `delta_mix` | **L2** | agregação; **imune ao ADR-036** (share intra-pleito) |
| **D** | Aresta participação (valor, ano) | **L2** | valor é L1; relação declarada é cruzamento |
| **D** | **Nó-empresa via parse de texto livre** | **L3** | extração heurística de entidade — disclaimer permanente, nó não-resolvido quando sem CNPJ |

**Ponto de rebaixamento pedido no brief:** a correção monetária rebaixa o valor
de **L1 (nominal bruto) → L2 (corrigido, reproduzível)**. Camada D rebaixa ainda
mais (**L3**) por causa do parse de texto livre, não da correção monetária.

## 8. Incrementos e sequência

```
Incremento 0  (PRÉ-REQUISITO, não estava no brief)
  └─ ingestão TSE bens + tabela raiz L1 + ponte CPF→parlamentar
        │
Incremento 1  (Camadas A → B → C)
  ├─ A  snapshot                (depende: Inc.0)
  ├─ B  evolução entre pleitos  (depende: Inc.0 + ADR-036)
  └─ C  mudança de mix          (depende: Inc.0; imune ADR-036)
        │
Incremento 2  (Camada D — SEPARADO e POSTERIOR)
  └─ grafo parlamentar↔CNPJ (ReactFlow #96) + ADR-037 — ponte p/ Eixo 3
```

Lista de issues sugeridas (esqueletos) mantida fora deste doc; ver entrega do
plano. ADR-036 destrava B; ADR-037 destrava D.

## 9. Fronteiras explícitas (fora de escopo)

- **Não** expandir para Portal da Transparência, Receita/CNPJ ou qualquer
  enriquecimento societário externo. Fonte única TSE.
- **Não** rastrear bens individuais entre pleitos (R3) — só categorias.
- **Não** inferir patrimônio em anos não-eleitorais (R1) — lacuna é lacuna.
- **Não** resolução fuzzy de empresa por nome (invariante 2) — nó não-resolvido.
- **Não** score, ranking de "enriquecimento suspeito" ou juízo editorial — o
  produto confronta fatos; a interpretação é do leitor.
- **Não** cálculo em request-time — tudo materializado (invariante 4).

## 10. ADRs e referências

- [ADR-036 — Correção monetária do patrimônio declarado](../architecture/ADR/036-correcao-monetaria-patrimonio.md) (accepted; IPCA número-índice SIDRA 1737/2266, data-base dez/2022 = 6474.09)
- [ADR-037 — Modelagem do grafo de participação societária](../architecture/ADR/037-grafo-participacao-societaria.md) (skeleton; Incremento 2)
- [ADR-018 — Cache de edge](../architecture/ADR/018-cache-edge-app.md) · [TRUST-PYRAMID.md](../architecture/TRUST-PYRAMID.md) · [DATA-SOURCES.md](../architecture/DATA-SOURCES.md) · [DATA-DICTIONARY.md](../domain/DATA-DICTIONARY.md)
- Issue #96 (grafo → ReactFlow, Wave 3.4 pausada)
