# ADR-037: Modelagem do grafo de participação societária (Eixo 2 — Camada D)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-16
> Status: **accepted**. Camadas A→C entregues e em produção; a Camada D é o
> próximo incremento. Decisões antes `[A DECIDIR]` resolvidas abaixo.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Camada D do [Eixo 2](../../product/EIXO-2-PATRIMONIO.md) representa a relação
**parlamentar ↔ empresa** via **participação societária declarada** (quotas,
ações) — a categoria de bem do TSE em que o bem *é* uma fração de uma pessoa
jurídica. É o caso de uso do ReactFlow (issue #96) e a **ponte para o futuro
Eixo 3** (rede de interesses cruzando parlamentares).

A base já está em produção: 99.283 bens federais 2014/2018/2022 ingeridos,
**5.845** deles de participação societária (categorias TSE 31 Ações, 32 Quotas,
39 Outras participações). O CNPJ, quando existe, vem **embutido na descrição
livre** `ds_bem` (ex.: *"Consórcio Canopus CNPJ 68.318.773/0001-54"*).

Restrições que moldam a decisão:
- **Fonte única.** CNPJ/empresa sai da descrição do próprio dataset TSE — não de
  Receita/CNPJ nem enriquecimento externo (invariante: não expandir fontes).
- **Determinístico, sem IA** (invariante 2). Extração por regex e normalização
  é permitida; **resolução fuzzy de entidade não é**.
- **Texto livre (R3).** A empresa frequentemente aparece sem CNPJ, só por nome
  livre, com grafias variáveis. Não se rastreia a cota individual entre pleitos.
- **Custo ~zero** (invariante 4): grafo materializado/cacheado; o ReactFlow só
  renderiza nós/arestas pré-computados.

## Decisão

### 1. Escopo v1: ego-grafo por parlamentar

A Camada D v1 é o **ego-grafo** de UM parlamentar: nó central = parlamentar,
nós satélite = empresas em que declarou participação, em qualquer pleito
vinculado. Renderizado na seção do perfil. O **grafo cruzado** (empresas
compartilhadas entre parlamentares) é o **Eixo 3** — fora deste escopo, mas o
modelo de nó (CNPJ como chave) é escolhido para estendê-lo sem retrabalho.

### 2. Nós e arestas

- **Nó parlamentar** (âncora — invariante 3, sujeito-político no centro). Reusa
  a identidade de `parlamentar`.
- **Nó empresa**, derivado da descrição livre:
  - **CNPJ extraível por regex** → nó **resolvido**, chave = CNPJ normalizado
    (14 dígitos). Dois bens com o mesmo CNPJ = o mesmo nó.
  - **só nome livre** → nó **não-resolvido**, chave = string normalizada
    *daquela* declaração. **Nunca fundir** nós por similaridade (invariante 2).
- **Aresta** `(parlamentar) —[participação]→ (empresa)`, atributos: `ano`,
  `pleito`, `valor declarado` (**nominal**; ver §4), `categoria` (Ações/Quotas/
  Outras). Múltiplos pleitos com a mesma empresa = múltiplas arestas temporais.

### 3. Persistência: query cacheada, sem tabela nova (v1)

O ego-grafo é montado por **query cacheada por parlamentar** (`cached()`,
ADR-018, TTL alinhado ao da Trilha), lendo os bens de participação e extraindo
o CNPJ em JS puro. **Sem tabela/migration nova** — o volume é pequeno e o
recorte é por parlamentar. Custo de runtime ~zero (cache de edge; extração roda
no miss, 1×/TTL). A **tabela de arestas materializada** fica para o **Eixo 3**,
quando o grafo cruzado exigir varredura global.

### 4. Valores nominais (não corrige por IPCA)

As arestas mostram o valor **nominal** declarado no pleito. A correção monetária
(ADR-036) é sobre *comparação de totais entre pleitos* (Camada B); no grafo o
valor é um atributo de magnitude do vínculo, não uma série comparável — manter
nominal evita sugerir comparação inexistente. Decisão revisável se o Eixo 3
pedir.

### 5. Renderização: ReactFlow na camada Brasil a Vera, **não** no RDS

O grafo é renderizado com **ReactFlow** (família `@xyflow/react`), como
**componente da camada Brasil a Vera** — client component, `dynamic` com
`ssr:false` e import sob demanda (mesmo padrão do bundle Recharts, ADR-034 §5),
de modo que o JS só carrega no perfil, sem peso no path anônimo.

**O RDS NÃO terá componentes de ReactFlow/grafo.** Visualização de grafo é
domínio específico do produto, não primitiva genérica de UI — logo **não** é um
gap a abrir upstream no RDS (contraste com a regra geral do
[ADR-038](038-*.md): gap genérico → issue upstream). Todo o *chrome* ao redor
(SectionCard, TrustBadge, legenda, empty state, badges de empresa) usa o **RDS**
normalmente; só o canvas do grafo é BaV-local.

### 6. Trust: L3

O nó-empresa derivado de texto livre é **L3** (extração heurística de entidade):
exige **disclaimer permanente** e tratamento visual explícito de nós
não-resolvidos. O nó parlamentar e o valor declarado são L1/L2; a *relação*
inferida do texto é o que rebaixa para L3.

## Alternativas Consideradas

### Alternativa A — Tabela relacional de arestas materializada (batch) `(adiada p/ Eixo 3)`
- Prós: queries de rede nativas, varredura global eficiente. Necessária quando
  o grafo cruzar parlamentares (Eixo 3).
- Contra (para v1): migration + passo de ingestão para um recorte que, por
  parlamentar, a query cacheada resolve barato. **Veredicto:** adiada.

### Alternativa B — Estrutura/extensão de grafo dedicada
- Contra: nova infra, contraria simplicidade e custo ~zero. **Rejeitada.**

### Alternativa C — Enriquecer empresa via fonte externa (Receita/CNPJ)
- **Rejeitada por invariante:** expandiria fontes. Mantém-se só o que o TSE
  declara; nós sem CNPJ ficam não-resolvidos.

### Alternativa D — Componente de grafo genérico no RDS
- **Rejeitada (decisão do owner):** grafo é viz de domínio, não primitiva
  genérica; fica na camada BaV, não vira gap upstream do RDS.

## Consequências

### Positivas
- Habilita a ponte para o Eixo 3 sem expandir fontes nem criar infra agora.
- Reusa a âncora parlamentar (invariante 3), o RDS (chrome) e o padrão de
  dynamic-import de charts (ReactFlow só no perfil, +0kb no anônimo).
- CNPJ como chave de nó já prepara o grafo cruzado do Eixo 3.

### Negativas
- Nó-empresa de texto livre é **L3**: qualidade limitada pela descrição do TSE;
  exige disclaimer e nós não-resolvidos explícitos.
- Possível fragmentação: a mesma empresa como vários nós não-resolvidos
  (consequência aceita de **não** fazer resolução fuzzy).
- Introduz ReactFlow como dependência nova na camada BaV (justificada no PR;
  issue #96).

### Neutras
- Valor de aresta nominal (não corrigido) — coerente com "magnitude do vínculo",
  revisável no Eixo 3.
- Persistência via cache (não tabela) é decisão de v1; o Eixo 3 a promove a
  tabela materializada.

## Referências

- [Eixo 2 — Trilha Patrimonial](../../product/EIXO-2-PATRIMONIO.md) §5.D e §7
- [ADR-036 — Correção monetária](036-correcao-monetaria-patrimonio.md)
- [ADR-018 — Cache de edge](018-cache-edge-app.md) · [ADR-034 §5 — bundle de charts](034-token-bridge-rds-e-promocao-fase-b.md)
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) (L3 — correlação/inferência, disclaimer)
- Issue #96 (grafo → ReactFlow); ADR-006 (frontend stack)
