# .claude/agents/ — subagents

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

## Subagents ativos

| Nome | Função |
|---|---|
| `design-system-curator` | Adicionar/revisar primitivas curadas seguindo o ADR-021 (regras remanescentes pós-[ADR-033](../../docs/architecture/ADR/033-adocao-react-design-system-externo.md)) |

## Histórico

- `frontend-skin-helper` — criado na Sprint 6.0 para o reskin Wave 6
  (composições HeroSection/KpiStrip/SectionCard etc.); aposentado em
  2026-06-10: o reskin terminou na Wave 6 e o contrato (label
  `auto-merged-wave-6`, prompt mestre Wave 6, "tokens fechados na
  Sprint 6.0") ficou 4 waves desatualizado enquanto a description
  proativa continuava disparando. Eventual sucessor para a migração
  RDS exige gargalo próprio (ADR-019), não substituição automática.

Evidência empírica primeiro, agente depois.
