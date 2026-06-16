# ADR-037: Modelagem do grafo de participação societária (Eixo 2 — Camada D)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-15
> Status: **proposed** — esqueleto. Incremento 2, **separado e posterior** às
> Camadas A→C. Não implementar antes do Incremento 1 estar estável. Vários
> pontos `[A DECIDIR]` deliberadamente em aberto.

---

## Contexto

A Camada D do [Eixo 2](../../product/EIXO-2-PATRIMONIO.md) representa a relação
**parlamentar ↔ empresa** via **participação societária declarada** (quotas,
ações) — a categoria de bem do TSE em que o bem *é* uma fração de uma pessoa
jurídica. É o caso de uso do ReactFlow (issue #96; **ainda não é dependência** —
ver `package.json`) e a **ponte para o futuro Eixo 3** (rede de interesses).

Restrições que moldam a decisão:
- **Fonte única.** O CNPJ/empresa vem da **descrição livre** dos bens de
  participação societária do próprio dataset TSE — **não** de Receita/CNPJ ou
  qualquer fonte externa (invariante: não expandir fontes).
- **Determinístico, sem IA** (invariante 2). Extração de CNPJ por regex e
  normalização de string é permitida; **resolução fuzzy de entidade não é**.
- **Texto livre (R3).** A empresa frequentemente aparece sem CNPJ, só por nome
  livre, com grafias variáveis. Não se rastreia a cota individual entre pleitos.
- **Custo ~zero** (invariante 4): grafo materializado em batch; ReactFlow
  apenas renderiza nós/arestas pré-computados.

## Decisão

> **Esqueleto.** A decisão final depende do Incremento 1 e de validação empírica
> sobre a forma real das descrições de participação societária no dataso TSE.

Proposta de modelagem (a ratificar):

### Nós
- **Parlamentar** (nó âncora — invariante 3, sujeito-político no centro). Reusa a
  identidade já existente em `parlamentar`.
- **Empresa/CNPJ.** Nó derivado da descrição livre:
  - quando há **CNPJ extraível por regex** → nó **resolvido**, chave = CNPJ
    normalizado.
  - quando há só **nome livre** → nó **não-resolvido**, marcado como tal, chave
    = string normalizada *daquela* declaração. **Nunca fundir** nós por
    similaridade de nome (invariante 2).

### Arestas
- `(parlamentar) --[participação declarada]--> (empresa)`, com atributos: `ano
  eleitoral`, `pleito`, `valor declarado` (nominal L1; corrigido L2 via ADR-036
  `[A DECIDIR se aplica a D]`), `categoria de origem`.
- Aresta = *declaração de vínculo num pleito*. Não se rastreia a cota individual
  entre pleitos (R3); múltiplos pleitos = múltiplas arestas temporais.

### Por que grafo e não tabela
- A relação é **muitos-para-muitos com semântica de rede** (um parlamentar em N
  empresas; uma empresa eventualmente ligada a M parlamentares — o gancho do
  Eixo 3). Perguntas naturais são de **adjacência e caminho** ("quem mais está
  ligado a esta empresa"), não de linha tabular.
- O valor de produto é a **visualização** da rede (ReactFlow #96). A persistência
  pode permanecer relacional (tabela de arestas) e ser *projetada* como grafo na
  materialização — `[A DECIDIR: persistir como tabela-aresta vs estrutura de
  grafo dedicada]`. Tabela de arestas materializada é o default barato.

### Ancoragem no parlamentar
- A navegação entra **sempre pelo perfil do parlamentar**; o grafo é uma seção
  do perfil, não uma rota top-level autônoma nesta camada. O Eixo 3 poderá
  inverter isso (entrar pela empresa) — fora de escopo aqui.

## Alternativas Consideradas

### Alternativa A — Tabela relacional de arestas, projetada como grafo
- Persistência simples (tabela `participacao`), ReactFlow consome projeção.
- Prós: barato, determinístico, encaixa o stack atual; contras: queries de
  caminho/comunidade mais verbosas (aceitável no volume esperado).

### Alternativa B — Estrutura de grafo dedicada / extensão de grafo
- Prós: queries de rede nativas; contras: nova dependência/infra, contraria
  simplicidade e custo ~zero. **Provavelmente rejeitada** salvo evidência.

### Alternativa C — Enriquecer empresa via fonte externa (Receita/CNPJ)
- **Rejeitada por invariante:** expandiria fontes. Mantém-se só o que o TSE
  declara.

## Consequências

### Positivas
- Habilita a ponte para o Eixo 3 sem expandir fontes agora.
- Reusa a âncora parlamentar (invariante 3) e o stack atual.

### Negativas
- Nó-empresa derivado de texto livre é **L3** (extração heurística): exige
  disclaimer permanente e tratamento explícito de nós não-resolvidos. Qualidade
  do grafo limitada pela qualidade da descrição TSE.
- Possível fragmentação: a mesma empresa como vários nós não-resolvidos
  (consequência aceita de *não* fazer resolução fuzzy).
- Introduz ReactFlow como dependência nova (justificar no PR; issue #96).

### Neutras
- Aplicar ou não a correção monetária (ADR-036) aos valores das arestas fica
  `[A DECIDIR]` no Incremento 2.

## Referências

- [Eixo 2 — Trilha Patrimonial](../../product/EIXO-2-PATRIMONIO.md) §5.D e §7
- [ADR-036 — Correção monetária](036-correcao-monetaria-patrimonio.md)
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) (L3 — correlação, disclaimer)
- Issue #96 (grafo → ReactFlow); ADR-006 (frontend stack, ReactFlow planejado)
