# .claude/agents/ — subagents

> Placeholder do PR 1. Primeiro subagent entra no PR 5 da Sprint 5.0.

Subagents são Claudes com contexto isolado, system prompt próprio e
ferramentas limitadas. Cada um vive em um arquivo `.md` com frontmatter
YAML (`name`, `description`, `tools`, `model`).

## Convenções

- Um subagent só nasce com **problema concreto observado** que skills/hooks
  não resolvem (ADR-019 aplicado).
- System prompt explicita **paths permitidos** e **paths proibidos** —
  isolamento de contexto não substitui guard rail explícito.
- Description orienta o orchestrator quando invocar; usar "USE
  PROATIVAMENTE quando..." quando o caso for óbvio.

## Subagents previstos para a Sprint 5.0

| Nome | Função | PR |
|---|---|---|
| `design-system-curator` | Adicionar/revisar primitivas shadcn-curadas seguindo os 7 passos do ADR-021 | PR 5 |

Não criar outros subagents nesta sprint. Evidência empírica primeiro,
agente depois.
