# ADR-000: Template para Architecture Decision Records

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-04-14
> Status: accepted

---

## Contexto

Este documento define o formato padrão para Architecture Decision Records (ADRs) do projeto Brasil a Vera. ADRs registram decisões arquiteturais significativas junto com o contexto e as consequências de cada decisão.

## Formato

Cada ADR segue a estrutura abaixo:

```markdown
# ADR-NNN: Título Descritivo

> Brasil a Vera · Arquitetura · vX.Y
> Última atualização: YYYY-MM-DD
> Status: [proposed | accepted | deprecated | superseded by ADR-NNN]

## Contexto

Qual é o problema ou necessidade que motivou esta decisão?
Quais são as forças em jogo (requisitos, restrições, trade-offs)?

## Decisão

O que foi decidido? Descrição clara e objetiva da decisão tomada.

## Alternativas Consideradas

### Alternativa A
- Descrição
- Prós e contras

### Alternativa B
- Descrição
- Prós e contras

## Consequências

### Positivas
- O que melhora com esta decisão

### Negativas
- Que trade-offs aceitamos
- Que limitações conhecidas existem

### Neutras
- Mudanças que não são claramente positivas nem negativas

## Referências

- Links para documentação, artigos ou discussões relevantes
```

## Regras

1. **Numeração sequencial** — ADRs são numerados a partir de 001, sem lacunas
2. **Imutabilidade** — um ADR aceito nunca é alterado; cria-se novo ADR que o supersede
3. **Exceção à imutabilidade** — correções de typo e atualização de status são permitidas
4. **Um ADR por decisão** — cada ADR trata de uma única decisão arquitetural
5. **Contexto antes de decisão** — o contexto deve ser suficiente para que alguém de fora entenda o porquê
6. **Consequências honestas** — trade-offs negativos são documentados com a mesma clareza que os positivos

## Referências

- [Michael Nygard — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
