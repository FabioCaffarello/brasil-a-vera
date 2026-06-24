# ADR-056: Ingestão de Lideranças, Blocos Partidários e Frentes Parlamentares

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-24
> Status: accepted

---

## Contexto

A auditoria de APIs de junho/2026 (`docs/audits/2026-06-api-gaps-planejamento.md`,
gaps G5–G7) identificou três conjuntos de entidades de poder político disponíveis
nas APIs mas não capturados:

- **Lideranças partidárias**: quem é líder/vice-líder de partido, governo,
  oposição ou minoria — Câmara (`/partidos/{id}/lideres`) e Senado
  (`/composicao/lideranca`).
- **Blocos partidários**: coalizões formais de partidos dentro de cada
  legislatura — Câmara (`/blocos`) e Senado (`/composicao/lista/blocos`).
- **Frentes parlamentares**: grupos temáticos suprapartidários — Câmara
  (`/frentes`, `/frentes/{id}/membros`). Senado não publica equivalente
  estruturado.

Esses dados são quase-estáticos (mudam raramente dentro de uma legislatura),
pequenos (dezenas de registros por tipo/legislatura) e de alto valor narrativo:
permitem exibir "Líder do Governo" no perfil do parlamentar e "Participou de N
frentes suprapartidárias" como dado de contexto.

A alternativa de estender tabelas existentes (`parlamentar` com campos de
liderança, `membro_comissao` com tipo "frente") foi rejeitada — mistura
semântica distintas e complica queries de listagem pura de comissões.

---

## Decisão

### Quatro novas tabelas no schema `parlamentares`

#### `parlamentares.lideranca_cargo`

Registro de cargo de liderança por parlamentar, tipo e entidade (partido ou
posição institucional como "Governo"/"Oposição"). Cobre Câmara e Senado na
mesma tabela.

Campos-chave:
- `tipo`: vocabulário normalizado pelo mapper (não enum SQL — o enum muda a
  cada nova fonte; usar texto é mais tolerante a extensões)
  - `LIDER_PARTIDO` · `VICE_LIDER_PARTIDO` · `LIDER_GOVERNO`
  - `LIDER_OPOSICAO` · `LIDER_MINORIA` · `LIDER_MAIORIA`
  - `LIDER_BLOCO`
- `entidade`: sigla do partido, bloco ou posição ("PT", "Governo", "Bloco ABC")
- `data_fim NULL` = vigente na legislatura corrente
- Chave natural: `(parlamentar_id, tipo, entidade, casa, legislatura)`

#### `parlamentares.bloco_partidario`

Snapshot da composição de cada bloco por legislatura/casa.
- `partidos text[]`: array de siglas dos partidos-membro
- Upsert integral por `(source_id, casa)` — a cada ingestão o array é
  substituído (composição é atômica, não log de mudanças)

#### `parlamentares.frente_parlamentar` + `parlamentares.frente_membro`

Duas tabelas: cabeçalho da frente e participação individual.
- `frente_parlamentar.source_id UNIQUE` — idempotência natural
- `frente_membro.titulo` preserva o papel do parlamentar (Presidente,
  Primeiro Vice-Presidente…) para confronto futuro

### Trust level e cadência

- Trust **L1** (fonte direta das APIs públicas, campo `tipo` normalizado no
  mapper — não interpretado além da normalização de vocabulário)
- Cadência **monthly** — dados quase-estáticos, mudam raramente dentro de
  uma legislatura; alinhado com a ingestão de filiação e bens TSE
- Tier **0** dentro da cadência mensal (dependem apenas de `parlamentar`
  populado, que é daily tier 0)

### UI: seção "Cargos e Lideranças" no perfil

- Nova seção após "Comissões" no perfil do parlamentar
- Sub-seção "Posições de liderança" (lideranca_cargo ativas, `data_fim IS NULL`)
- Sub-seção "Frentes parlamentares" (via frente_membro)
- Badge de destaque no header do perfil quando `tipo` relevante
  (prioridade: LIDER_GOVERNO > LIDER_OPOSICAO > LIDER_PARTIDO > LIDER_BLOCO)
- Copy neutro: "Cargo de liderança é designação interna da Casa — não implica
  posição ideológica do parlamentar."

---

## Alternativas Consideradas

### A) Estender `membro_comissao` com `tipo = 'FRENTE'`
- Reutiliza tabela existente sem migration
- **Rejeitado**: mistura comissões permanentes/temporárias com frentes
  suprapartidárias; queries de "comissões do parlamentar" precisariam
  filtrar `tipo != 'FRENTE'` — acoplamento implícito

### B) Campo `lideranca` em `parlamentar`
- Um campo de texto no perfil principal
- **Rejeitado**: não suporta histórico, múltiplas lideranças simultâneas nem
  a composição de blocos; desnormalização sem ganho real

### C) Tabela única `poder_estrutural` com `tipo_entidade`
- Une lideranças, blocos e frentes num único `type` enum
- **Rejeitado**: semânticas muito distintas (liderança é de parlamentar,
  bloco é de partidos, frente é de parlamentares); queries complicadas
  sem ganho de storage

---

## Consequências

**Positivas:**
- Exibição de "Líder do Governo" / "Líder da Oposição" no perfil torna
  o poder político explícito para o cidadão
- Composição dos blocos fecha o loop com `orientacao_bancada` (que já usa
  sigla de bloco) — UI pode mostrar "Bloco X é formado por PT, PCdoB, PV"
- Frentes suprapartidárias revelam coalizões temáticas além dos partidos

**Negativas / Riscos:**
- Câmara: `/partidos/{id}/lideres` exige loop por partido — pacing necessário
- Senado: estrutura do XML de liderança difere do padrão JSON da Câmara —
  mapper separado por casa
- `tipo` como texto livre (não enum SQL) — normalização fica no mapper;
  inconsistência de vocabulário entre ingestões é risco gerenciado por testes
  de mapper com fixtures reais

---

## Referências

- Gaps G5, G6, G7 em `docs/audits/2026-06-api-gaps-planejamento.md`
- ADR-033: strangler fig para adição de entidades novas
- ADR-019: proibição de código especulativo — cada tabela tem endpoint
  confirmado na API
- ADR-003: Neon PostgreSQL; schema `parlamentares` já existente
