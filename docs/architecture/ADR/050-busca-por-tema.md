# ADR-050: Busca por tema — taxonomia curada, não keywords de discurso

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-22
> Status: proposed

> Porta de entrada por ASSUNTO (complementa a entrada por estado do
> "Quem me representa"). Respeita a moldura de copy neutra do
> [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 e o "sem IA" do
> [ADR-019](019-disciplina-arquitetural-sem-gargalo.md).

## Contexto

O cidadão se importa com **temas** (saúde, segurança, educação), não só com nomes
ou estados. Faltava uma entrada por assunto. Há duas fontes possíveis de tema, e
a escolha entre elas é a decisão central deste ADR.

**Diagnóstico empírico (2026-06-22, princípio 13):**

| Fonte | Achado |
| --- | --- |
| `discurso.keywords` | 53k discursos, mas keywords **ruidosas**: misturam tema, entidade e **procedural** ("Orientação de bancada", "Projeto de lei ordinária" no topo). Exigiria curadoria/heurística para virar tema. |
| `proposicao_tema` | **Taxonomia oficial e CURADA da Câmara: 30 temas limpos** ("Direitos Humanos e Minorias" 306, "Saúde" 152, "Finanças Públicas e Orçamento", "Trabalho e Emprego"…). 770 proposições com tema; **495 parlamentares** ligáveis por autoria. `codigo_tema` ↔ `nome_tema` estável. |

## Decisão

### D1 — Fonte do tema = `proposicao_tema` (curada), não keywords de discurso

A busca por tema usa a **taxonomia oficial** `proposicao_tema` (30 temas), não a
agregação de `keywords` de discurso. Determinístico, sem IA, sem heurística de
curadoria — os temas já vêm classificados pela fonte.

### D2 — Tema → parlamentar por AUTORIA

Para cada tema: as proposições classificadas nele e os parlamentares que mais as
**autoram** (autoria primária/coautoria com `parlamentar_id`). "Quem legisla
sobre X" = quem propõe sobre X. Fail-closed: autor externo (sem `parlamentar_id`)
não entra.

### D3 — Copy honesta (estende ADR-040 §4)

- **Autoria ≠ engajamento total:** "quem propõe sobre o tema" não é "quem mais se
  importa"; é um sinal factual de produção legislativa no assunto. Sem ranking
  valorativo de "quem trabalha mais".
- **Cobertura parcial:** só proposições já ingeridas e classificadas com tema
  entram; a copy diz isso. Não inferir ausência de interesse de ausência de dado.

## Alternativas Consideradas

### Alternativa A — agregar `discurso.keywords` por tema
- **Descartada (D1):** ruído procedural domina; exigiria curadoria/IA (ADR-019).
  A taxonomia curada já resolve sem isso.

### Alternativa B — classificar proposições/discursos por IA
- **Descartada:** introduz L3/L4 e viés; a fonte já classifica (ADR-019).

## Consequências

### Positivas
- Nova porta de entrada por assunto, determinística e limpa, **sem ingestão
  nova, sem schema, sem IA** — só ativa `proposicao_tema` já ingerido.
- Conecta o cidadão por interesse → parlamentares + proposições → dossiê.

### Negativas
- **Cobertura parcial** (770 proposições com tema): temas refletem o ingerido;
  cresce com a ingestão. Documentado.
- **Só autoria da Câmara mapeia parlamentar** (autoria do Senado é string sem
  `parlamentar_id`) — temas de matérias do Senado podem ter menos autores ligados.

### Neutras
- Sem tabela nova; query + páginas sobre `proposicao_tema`/`proposicao_autor`.

## Classificação na Pirâmide de Confiança

| Dado | Nível |
| --- | --- |
| Tema de uma proposição (`proposicao_tema`) | **L1** (classificação oficial) |
| Contagem de proposições/autores por tema | **L2** (agregação determinística) |

## Não-objetivos (fora de escopo)

- **Keywords de discurso** como fonte de tema (D1).
- **Classificação por IA / análise de sentimento.**
- **Ranking valorativo** de "quem mais trabalha o tema" (D3).
- **Busca textual** no inteiro teor.
- **Afirmações de cobertura** antes de reconfirmar contra prod (DB local; Neon 402).

## Referências

- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [ADR-019](019-disciplina-arquitetural-sem-gargalo.md) — sem complexidade/IA especulativa.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md).
- Diagnóstico empírico (2026-06-22): 30 temas curados, 770 proposições, 495
  parlamentares ligáveis.
