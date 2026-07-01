# ADR-063: Vínculo heurístico parlamentar → tse_candidatura (L3)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-07-01
> Status: accepted

## Contexto

A Trilha Patrimonial (ADR-047) liga `parlamentar` a `tse_bem_candidato` via CPF exato.
A Frente A do Sprint 39 confirmou empiricamente o estado atual:

| Cobertura | Câmara | Senado |
|---|---|---|
| Parlamentares totais | 645 | 81 |
| Com CPF preenchido | 645 (100%) | 72 (88,9%) |
| Com candidatura TSE linkada | 645 (100%) | 72 (88,9%) |
| Bens declarados acessíveis | 12.966 | 1.586 |

Os 9 senadores sem cobertura são **suplentes que não disputaram** os pleitos de
2014, 2018 ou 2022 no âmbito federal — não têm entrada em `tse_candidatura`.
Nenhum tem similaridade de nome ≥ 0,90 com qualquer candidatura federal do TSE
(máximo observado: 0,57 para "Alexandre Luiz Giordano").

A cobertura de 100% na Câmara e 88,9% no Senado é o **teto atual** da abordagem
determinística (CPF exato via `backfill:senado:cpf`). Esse teto subirá quando o
TSE publicar os dados do pleito de **2026** — todos os senadores com suplência
ativa possivelmente candidataram-se em eleições estaduais ou municipais anteriores,
mas esses ciclos estão fora do escopo de `CARGOS_FEDERAIS = {5, 6}`.

## Problema

Issue #426 propõe um vínculo heurístico por nome normalizado + partido + UF
classificado como L3 (inferência falível), para cobrir os 9 senadores restantes.
Antes de implementar, é preciso definir:

1. **Critério de aceite** — que score mínimo justifica escrever `parlamentar_id`?
2. **Tratamento de empate/homônimo** — dois candidatos com score idêntico para o
   mesmo senador: qual prevalece?
3. **Como expor a incerteza** no UI — onde o disclaimer L3 aparece e o que diz.
4. **Quando a heurística se torna desnecessária** — se 2026 TSE cobrir os 9,
   a heurística é um custo permanente sem benefício marginal.

## Decisão

### Fase 1 — aguardar TSE 2026 (decisão imediata)

**Não implementar a heurística L3 agora.** Os motivos:

- Os 9 senadores não têm correspondente em `tse_candidatura` em nenhuma similarity
  ≥ 0,70 (testado empiricamente 2026-07-01 com pg_trgm). O vínculo heurístico
  *por nome vs tse_candidatura federal* não produz resultado — a tabela não tem a
  entrada. A heurística proposta em #426 só ajudaria casos com score < 0,90 mas
  > 0 — não é esse o caso dos 9 senadores.

- Custo de manutenção permanente: flags de método (`method: 'heuristic'`),
  disclaimer L3 no UI, testes de regressão de falsos positivos — para zero
  ganho no conjunto atual.

- Prazo de revisão natural: pleito federal de outubro 2026. Assim que o TSE
  publicar `consulta_cand_2026.zip`, o script `tse-bens` ingere as candidaturas
  federais de senadores suplentes que correram em 2026, e o `backfill:senado:cpf`
  automaticamente os cobre na execução mensal seguinte.

### Fase 2 — reavaliação pós-2026 (decisão futura)

Após ingesta de TSE 2026, reabrir #426 com os senadores que **ainda** ficaram
sem cobertura (estimativa: ≤ 2, casos de mandato cedido por falecimento/renúncia
sem eleição própria). Para esse residual, a heurística é justificada se:

- Score mínimo ≥ 0,85 no algoritmo Levenshtein normalizado (ADR-055 §algoritmo).
- Sem empate: se dois candidatos têm score ≥ 0,85 para o mesmo parlamentar,
  nenhum é escrito (log `WARN` de ambiguidade).
- UF como tiebreaker: se um dos candidatos com score ≥ 0,85 tem a mesma UF do
  senador, esse prevalece.
- Flag de método: `match_method = 'heuristic_nome'` (coluna futura em
  `parlamentar` ou em tabela de auditoria).
- Disclaimer no UI: card de patrimônio mostra `⚠ Vínculo inferido por nome` com
  link para `/sobre/metodologia#alinhamento` explicando L3.

Esse residual só vale ADR de implementação se for > 0 senadores pós-2026.

## Alternativas Consideradas

### A — Heurística de nome contra `tse_candidatura` já (Fase 1 imediata)
**Rejeitada**: os 9 senadores simplesmente não existem no corpus federal do TSE
para 2014/2018/2022. Score máximo = 0,57 (abaixo do limiar de 0,85 proposto
mesmo pela heurística relaxada). Zero benefício, custo de manutenção real.

### B — Web scraping do Portal do Senado para CPF
**Rejeitada**: fonte não-oficial, frágil, e já descartada em ADR-055.

### C — Mapeamento manual (CPF hardcoded) dos 9 senadores
**Rejeitada**: viola ingestão automatizada (ADR-019); cada novo suplente exige
atualização manual. Aceitável apenas como diagnóstico pontual no runbook de ops,
não no código de produção.

## Consequências

### Imediatas (Sprint 39)
- Cobertura Câmara: 100% — sem mudança.
- Cobertura Senado: 88,9% (72/81) — sem mudança de número, MAS agora os 72
  senadores com CPF têm `tse_candidatura.parlamentar_id` preenchido
  (bug do DAG t1/t2 corrigido em `backfill:senado:cpf`).
- #426 permanece aberto com `status: deferred` até pós-2026.

### Futuras
- TSE 2026 disponível: re-executar `tse-bens` com `ANO=2026` + mensal seguinte
  resolve automaticamente a maioria dos 9.
- Residual pós-2026 > 0: reavalia Fase 2 conforme critérios acima.

## Referências

- [ADR-047](047-confronto-variacao-patrimonial-mandato.md) — Trilha Patrimonial
- [ADR-055](055-cpf-senador-via-tse-candidatura.md) — Estratégia de CPF via TSE (aceito)
- Issue #426 — implementação da heurística (deferred)
- Issue #427 — audit de CPF senadores (fechado Sprint 39, evidência empírica 2026-07-01)
- `ingestion/senado/backfill-cpf.ts` — fix fase 2 de link (Sprint 39)
