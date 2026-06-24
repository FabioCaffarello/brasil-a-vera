# Plano Sprint 11.0 — CPF Senador via TSE + Partido/UF no instante do voto

> Brasil a Vera · Wave 11 Sprint 11.0 · v1.0
> Data: 2026-06-23
> Status: draft (aguardando aprovação do owner)

## Contexto da Wave 11

A Wave 11 fecha as lacunas de cobertura de dados identificadas na auditoria de junho/2026:
G0/G1/G2/G4 foram entregues em ciclos anteriores; **G3 (CPF Senador) é a única lacuna
de código restante** e bloqueia a Trilha Patrimonial (ADR-047) para os 81 senadores.
L1 é um dado latente no payload de votações (custo zero de fetch) que habilita cálculo
de fidelidade no momento do voto sem join em query-time.

Sprint 11.0 combina os dois itens porque são ortogonais (não se bloqueiam), ambos têm
custo de fetch zero, e juntos desbloqueiam análises de coerência cruzada parlamentar×voto.

---

## Pré-leitura confirmada

- [x] `docs/product/ROADMAP.md` — Wave 11 posicionada após Wave 10 (área logada)
- [x] `docs/releases/v0.9.0-votacao-360.md` — última release com achados de Waves 8/9
- [x] `docs/releases/v0.8.0-proposicao-360.md` — padrão de arquitetura de release
- [x] `docs/architecture/ADR/035-orquestracao-ingestao-config-driven.md` — registry + DAG
- [x] `docs/architecture/ADR/042-modelagem-votacao-senado.md` — schema votos Senado
- [x] `docs/architecture/ADR/043-fidelidade-partidaria-duas-definicoes.md` — contexto de uso
- [x] `docs/architecture/ADR/047-confronto-variacao-patrimonial-mandato.md` — Trilha Patrimonial
- [x] `ingestion/senado/bio.ts` + `bio-schema.ts` — confirmação da ausência de CPF na API
- [x] `ingestion/tse/bens.ts` — fonte alternativa (tse_candidatura cd_cargo=5)
- [x] `ingestion/camara/votacoes.ts` (ou equivalente) — payload de votos Câmara
- [x] `src/shared/db/migrations/` — coluna `cpf` já existe em `parlamentar` (nullable)
- [x] Swagger Senado (`legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html`) — XSD confirma ausência de NumeroCPF
- [x] Swagger Câmara (`dadosabertos.camara.leg.br/swagger/api.html`) — campos `deputado_.siglaPartido` / `siglaUf` confirmados
- [x] Chamadas reais às APIs (curl) — ambos confirmados empiricamente

---

## Achados da investigação de viabilidade

### G3 — CPF Senador

**A premissa da auditoria de cobertura estava errada.** O campo `NumeroCPF` **não existe**
no endpoint `/senador/{codigo}` da API do Senado. Verificado em três fontes independentes:
XSD oficial (`DetalheParlamentarv5.xsd`), chamada real a `/senador/5322` e `/senador/6328`,
e schema Zod atual (`bio-schema.ts`). A API não expõe CPF em nenhum endpoint disponível.

**Caminho alternativo confirmado:** `tse_candidatura` (já populada pelo script `tse-bens`,
cadência monthly t1) contém `cpf`, `nm_candidato`, `cd_cargo`, `sg_uf`. O `CD_CARGO = 5`
corresponde a Senador. A ponte é via **name-matching normalizado**:
`nm_candidato` (TSE, maiúsculas, ex: "ROMARIO DE SOUZA FARIA") ↔
`parlamentar.nome_civil` (Senado, titulada, ex: "Romario de Souza Faria").

**Pré-requisito de DAG:** `tse_candidatura` precisa ter dados antes do backfill rodar.
O registry já posiciona `tse-bens` em monthly t1; o novo `backfill:senado:cpf` entra em t2.
**Sem migração de banco:** `parlamentar.cpf TEXT` já existe e é nullable.

### L1 — Partido/UF no instante do voto

**Câmara confirmado** via chamada real a `/votacoes/2633410-8/votos`:
```json
"deputado_": { "siglaPartido": "MDB", "siglaUf": "DF", ... }
```

**Senado confirmado** via schema Zod já existente em `votacoes-schema.ts` (campos
`siglaPartidoParlamentar` e `siglaUFParlamentar` já parseados — apenas descartados
no mapper). Custo de fetch = zero.

**Migração necessária:** duas colunas novas em `votacoes.voto_nominal`, ambas nullable.
Nenhuma query existente quebra (campos são aditivos). MVP sem backfill: votos anteriores
ao próximo cron ficam com `NULL`; acumulam automaticamente.

---

## Decisões já tomadas (não revisitar)

1. **API Senado não expõe CPF.** Verificado empiricamente via XSD + curl em produção.
   Fonte é `tse_candidatura`, não API do Senado.

2. **Match de alta confiança para G3.** O script só escreve CPF onde similaridade
   normalizada ≥ 90%. Senadores sem match ficam com `cpf NULL` e recebem log `WARN`
   com nome para diagnóstico manual. Sem falso positivo.

3. **L1 MVP sem backfill.** Colunas `partido_sigla_voto` e `uf_voto` ficam `NULL`
   para votos anteriores à próxima execução do cron diário. Acumulam automaticamente.
   Backfill estendido (`DATA_INICIO`) é follow-up opcional quando cota Neon permitir.

4. **L1 cobre Câmara e Senado neste sprint.** O schema Zod do Senado já captura os campos;
   é só adicionar ao mapper — custo de código mínimo.

5. **Sem nova tabela para G3.** O script atualiza `parlamentar.cpf` diretamente via UPDATE.
   Não há tabela de staging ou log de confiança no banco — o diagnóstico fica em stderr/log.

---

## Decisões pendentes

- **D1** — Algoritmo de similaridade para name-matching de G3: Levenshtein normalizado
  ou Jaro-Winkler? Jaro-Winkler é mais robusto para nomes próprios (prefixo pesado),
  mas adiciona uma pequena dep. Levenshtein é mais simples e já suficiente se o
  limiar for calibrado. Usar lib nativa (`fastest-levenshtein`) ou implementação inline?

- **D2** — Limiar exato de similaridade: 0.90 ou 0.85? 0.90 = menos falsos positivos
  + mais NULLs (safe default). 0.85 = mais cobertura + risco de match errado em nomes curtos.
  Validar empiricamente rodando o script em modo dry-run e inspecionando a distribuição
  de scores antes de commitar.

- **D3** — O diagnóstico de senadores sem match fica só em stderr do script, ou também
  gera um arquivo de saída (`/tmp/cpf-match-report.txt`) para inspeção manual?

---

## PRs propostos

| # | Conteúdo | Tipo |
|---|---|---|
| 1 | **L1 — Migração + mapper:** `ALTER TABLE votacoes.voto_nominal ADD COLUMN partido_sigla_voto text, ADD COLUMN uf_voto char(2)`; schema Drizzle atualizado; mapper Câmara (`votos-mapper.ts`) e mapper Senado (`votacoes.ts`) incluem os campos | feat |
| 2 | **G3 — Backfill CPF Senador:** `ingestion/senado/backfill-cpf.ts` (lê `tse_candidatura WHERE cd_cargo=5`, normaliza `nm_candidato`, match com `parlamentar.nome_civil`, UPDATE onde ≥ limiar D2); função de normalização pura em `ingestion/shared/normalize-nome.ts`; registro em `registry.ts` (monthly t2, após `tse-bens`); `package.json` com script `backfill:senado:cpf` | feat |
| 3 | **Closure:** ADR-055 documentando a fonte alternativa (ausência de CPF na API Senado, decisão de usar tse_candidatura, limiar de confiança, DAG); atualização do ROADMAP apontando Sprint 11.0 como concluída | docs |

### Delta de código por PR

**PR 1 — L1:**

| Arquivo | O que muda |
|---|---|
| `src/shared/db/migrations/XXXX_voto_partido_uf.sql` (novo) | `ALTER TABLE votacoes.voto_nominal ADD COLUMN partido_sigla_voto text, ADD COLUMN uf_voto char(2)` |
| `src/modules/votacoes/domain/schema.ts` | `partidoSiglaVoto: text(...)` e `ufVoto: char(..., { length: 2 })` em `votoNominal` |
| `ingestion/camara/votacoes.ts` (mapper) | Incluir `partidoSiglaVoto: parsed.data.deputado_.siglaPartido ?? null` e `ufVoto: parsed.data.deputado_.siglaUf ?? null` |
| `ingestion/senado/votacoes.ts` (mapper) | Incluir `partidoSiglaVoto: rawVoto.siglaPartidoParlamentar ?? null` e `ufVoto: rawVoto.siglaUFParlamentar ?? null` |

**PR 2 — G3:**

| Arquivo | O que muda |
|---|---|
| `ingestion/senado/backfill-cpf.ts` (novo) | Script: lê `tse_candidatura WHERE cd_cargo=5 AND cpf IS NOT NULL`; normaliza `nm_candidato`; cruza com `parlamentar WHERE casa='SENADO'`; UPDATE onde match ≥ limiar; WARN para sem match |
| `ingestion/shared/normalize-nome.ts` (novo) | Função pura `normalizarNome(s: string): string` — strip acentos, lowercase, trim, colapsa espaços múltiplos |
| `ingestion/registry.ts` | Adicionar `backfill:senado:cpf` em monthly t2 (após `tse-bens` t1) |
| `package.json` | Novo script `"backfill:senado:cpf": "tsx ingestion/senado/backfill-cpf.ts"` |

---

## Dependências novas (ADR-019)

Nenhuma dependência de runtime nova. Para o algoritmo de similaridade de G3:

- **Opção A (recomendada):** implementação inline de Levenshtein normalizado (~15 linhas TS puro).
  Zero dep nova. Suficiente para o caso de uso (nomes de pessoas, comprimento fixo).
- **Opção B:** `fastest-levenshtein` (~2 KB, zero deps transitivas, ESM+CJS). Só se
  benchmarks mostrarem que a inline é um gargalo — improvável para 81 senadores.

Decisão final pendente de D1.

---

## Riscos identificados

1. **Match parcial em G3 (principal):** TSE usa nome eleitoral completo em maiúsculas
   (`NM_CANDIDATO`); Senado popula `nome_civil` de `NomeCompletoParlamentar` (titulado,
   ex: sufixo "Neto/Filho", abreviações). Estimativa: ~85-90% de match automático; ~10-15%
   de senadores ficam com `cpf NULL` no primeiro run e precisam de diagnóstico manual.
   Mitigação: DRY_RUN mode no script (log sem UPDATE), rodar e inspecionar antes de commitar.

2. **tse_candidatura vazia localmente (G3):** `tse-bens` não rodou no ambiente local
   (Neon 402 até 2026-07-01). O script de backfill precisa que `tse_candidatura` tenha
   dados para executar. Em produção o DAG garante a ordem; localmente o desenvolvedor
   precisa rodar `npm run ingest:tse:bens` primeiro (ou usar DB Docker local).

3. **Colunas NULL em voto_nominal (L1):** Queries existentes que usam `voto_nominal`
   precisam tratar `partido_sigla_voto` / `uf_voto` como nullable se os consumirem.
   Verificar `src/lib/queries/` antes do PR: nenhuma query quebra (campos são aditivos),
   mas futuras queries de fidelidade-por-voto devem filtrar `IS NOT NULL` para excluir
   votos históricos.

4. **Senadores com CPF duplicado no TSE (G3):** Um parlamentar pode ter se candidatado
   múltiplas vezes (deputado federal → senador). `tse_candidatura` pode ter N linhas
   com o mesmo CPF e nomes ligeiramente diferentes. O script deve fazer `DISTINCT ON (cpf)`
   ou priorizar a candidatura mais recente para evitar ambiguidade.

---

## Critério de sucesso da sprint

- `SELECT COUNT(*) FROM parlamentar WHERE casa='SENADO' AND cpf IS NOT NULL` > 70
  (≥ 85% de 81 senadores com match automatizado de alta confiança)
- Log do script de G3 lista explicitamente os senadores sem match (com nome) para
  diagnóstico manual do owner
- `SELECT COUNT(*) FROM votacoes.voto_nominal WHERE partido_sigla_voto IS NOT NULL`
  cresce a cada run do cron diário após o PR 1 ser mergeado
- `npm run check`, `npm run test --run`, `DATABASE_URL=placeholder npm run build`
  passam sem regressão
- ADR-055 publicado com a decisão de fonte alternativa documentada e auditável

---

## Fora do escopo desta sprint

- **Backfill L1 histórico:** Reingesta de votos anteriores à janela padrão — follow-up
  quando cota Neon permitir (issue a abrir se demandado).
- **UI para partido/UF no voto:** As colunas novas ficam disponíveis no banco; consumo
  em queries e componentes é trabalho de Sprint 11.1+.
- **Cruzamento tse_bem_candidato ↔ parlamentar (Senado):** Depende de G3 estar populado.
  É o objetivo da Sprint 11.1 (Trilha Patrimonial para Senadores).
- **Diagnóstico manual dos ~10-15% sem match:** Fora do escopo automatizado; será
  tratado como follow-up manual ou em script auxiliar separado.
