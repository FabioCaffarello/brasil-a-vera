---
name: adr-audit
description: |
  Audita o estado dos ADRs do projeto: identifica proposed sem decisão,
  accepted sem implementação correlata, deprecated sem substituto, e
  docs que contradizem ADRs aceitos. Correlaciona com issues abertas.
  Produz recomendações de closure, atualização ou ação. Use antes de
  planejar uma wave, ou quando o usuário pedir "como estão nossos ADRs?".
---

Quando invocado (`/adr-audit`):

## Passo 1 — Inventário completo de ADRs

```bash
for f in docs/architecture/ADR/[0-9]*.md; do
  status=$(grep -m1 "Status:" "$f" | sed 's/.*Status: //')
  num=$(basename "$f" | cut -d- -f1)
  title=$(grep -m1 "^# ADR" "$f" | sed 's/# ADR-[0-9]*: //')
  echo "$num | $status | $title"
done | sort
```

## Passo 2 — ADRs proposed: diagnóstico de stagnação

Para cada ADR com status `proposed`:

```bash
grep -l "Status: proposed" docs/architecture/ADR/[0-9]*.md
```

Para cada um, leia e responda:
1. **A decisão já foi tomada implicitamente?** (código implementado, issue fechada)
   → Recomendar: marcar `accepted` ou `superseded`
2. **Há bloqueio empírico?** (marcador `[A CONFIRMAR]`, dado de prod necessário)
   → Recomendar: manter `proposed` + criar issue de gate empírico
3. **A decisão está obsoleta?** (wave passou, feature descartada)
   → Recomendar: marcar `rejected` com motivo

```bash
# Issues correlatas abertas ou fechadas recentemente
gh issue list --state all --limit 50 \
  --json number,title,state,closedAt \
  --jq '.[] | select(.title | test("ADR|confronto|presença|fidelidade|patrimônio|discurso|busca")) | "\(.state) #\(.number): \(.title)"'
```

## Passo 3 — ADRs accepted: há implementação correlata?

Para ADRs críticos (que afetam código ativo), verifique se a decisão
está refletida no código:

Exemplos de verificação:
```bash
# ADR-018: todo query tem cached()?
grep -rL "cached(" src/lib/queries/ 2>/dev/null | grep "\.ts$"

# ADR-015: split de driver funciona?
grep -rn "DB_DRIVER" src/ ingestion/ | head -5

# ADR-053: componentes de domínio usam RDS, não reinventam?
grep -rn "from.*design-system" src/components/ | grep -v "rds-" | head -10
```

## Passo 4 — Docs que contradizem ADRs

Verifique os documentos de arquitetura contra ADRs aceitos:

```bash
# BOUNDED-CONTEXTS.md ainda menciona Go ou NATS?
grep -n "Go\|NATS\|microserviço\|Wave 3+" docs/architecture/BOUNDED-CONTEXTS.md

# DOMAIN-MODEL.md atualizado?
grep -n "Go\|NATS\|Wave 3+" docs/architecture/DOMAIN-MODEL.md 2>/dev/null
```

## Passo 5 — Síntese

### Status summary

| Status | Count | ADRs |
|--------|-------|------|
| accepted | N | lista |
| proposed | N | lista com recomendação |
| deprecated/superseded | N | lista |
| rejected | N | lista |

### Ações recomendadas (ordenadas por urgência)

Para cada ADR proposed, uma linha:

| ADR | Situação | Recomendação | Ação concreta |
|-----|----------|-------------|---------------|
| 043 | Fidelidade partidária | accepted — decisão tomada, banco tem filiacao_historica | Mudar status para `accepted`, criar issue de implementação da feature |
| ... | ... | ... | ... |

### ADRs que precisam de gate empírico antes de aceitar

Liste os ADRs com marcadores `[A CONFIRMAR]` e o que precisa ser medido
em prod (Neon, API pública) antes de aceitar.

### Docs desatualizados detectados

Lista de arquivos em `docs/architecture/` que contradizem ADRs aceitos,
com linha exata e correção recomendada.

## Regras

- Nunca mude o status de um ADR diretamente — só recomende
- A mudança de status é PR do owner
- Se um ADR proposed tem implementação viva no código → forte sinal de `accepted`
- `rejected` é legítimo e útil — preserva a memória de por que não foi feito
- Não crie novos ADRs — use `/new-adr` para isso
