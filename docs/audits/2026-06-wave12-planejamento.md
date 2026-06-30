# Diagnóstico de maturidade e planejamento Wave 12

> Brasil a Vera · Auditoria · 2026-06-29  
> Método: workflow multi-agente (10 agentes em paralelo) — análise do registry,
> schema do banco, rotas de produto, ADRs 042-060, scan ao vivo dos Swaggers
> Câmara (`dadosabertos.camara.leg.br`) e Senado
> (`legis.senado.leg.br/dadosabertos`), e auditoria de dados latentes.  
> Sucede e atualiza `2026-06-api-gaps-planejamento.md` (2026-06-23).

---

## 1. Score de maturidade atual

| Dimensão | Score | Avaliação |
|----------|------:|-----------|
| Cobertura de ingestão | **7,5 / 10** | 37 entradas no registry; G0–G12 resolvidos; G13 usa endpoint deprecated; G14 bloqueado por decisão arquitetural |
| Superficialização na UI | **6 / 10** | Vários dados ingeridos sem rota navegável (frentes, mesa diretora, blocos explicados); bugs factuais em drawer de votos |
| Paridade bicameral | **6 / 10** | Paridade avançou muito (G0, G1, G5, G6, G9); assimetrias remanescentes: gastos, cargos de comissão do Senado (gap novo), CPF com status incerto |
| Qualidade de dado | **5,5 / 10** | `voto_nominal.partido_sigla_voto` nunca lido na UI (bug factual ativo); `filiacao_partidaria` com 0 linhas suspeitas; queries exportadas nunca conectadas |

**Conclusão geral:** o gargalo primário mudou de eixo — já não é ausência de dados, mas **desperdício de dados já capturados**. A espinha dorsal de ingestão está sólida; o trabalho urgente está em bugs factuais + entidades ingeridas sem rota de produto.

---

## 2. Bugs factuais ativos (produção)

### BUG-1 — Partido exibido no drawer de votos é o partido atual, não o do momento do voto

**Onde:** `src/lib/queries/votacoes.ts` → `getVotosByVotacao()`; renderizado em `src/components/votacao/votos-drawer.tsx`

**O problema:** a query faz JOIN em `parlamentar.partido_sigla` (partido atual). O campo `voto_nominal.partido_sigla_voto` existe no banco desde a migration 0028 e captura o partido na data do voto. Para parlamentares que mudaram de sigla após a votação, a informação exibida é **factualmente incorreta**.

**Custo do fix:** cirúrgico — substituição de 1 coluna no SELECT + reexibição no componente.

---

### BUG-2 — `filiacao_partidaria` pode ter 0 linhas em produção

**Evidência:** auditoria de junho registrou 0 linhas localmente; os scripts `camara-filiacoes` e `senado-filiacoes` estão no registry mas nunca foi confirmado empiricamente se rodaram com sucesso em prod.

**Impacto:** `getFidelidadeBancada` e `getFidelidadeOrientacao` calculam fidelidade sobre base potencialmente vazia → scores silenciosamente incorretos em `/parlamentares/[id]` e `/partidos/[sigla]`.

**Diagnóstico necessário antes de tudo:** `SELECT count(*) FROM filiacao_partidaria` em prod.

---

## 3. Status dos gaps G0–G14 (atualizado)

| Gap | Descrição | Status |
|-----|-----------|--------|
| G0 | Orientação de bancada Senado | ✅ Implementado |
| G1 | Votação→proposição Senado | ✅ Implementado |
| G2 | Filiação partidária | ✅ Registry OK — confirmar em prod |
| G3 | CPF do senador | ⚠️ `senado-backfill-cpf` existe; confirmar se `parlamentar.cpf IS NOT NULL` para senadores |
| G4 | Discursos (metadados) | ✅ Implementado |
| G5 | Lideranças partidárias e de governo | ✅ Implementado |
| G6 | Blocos parlamentares | ✅ Implementado |
| G7 | Frentes parlamentares (Câmara) | ✅ Implementado |
| G8 | Mesa Diretora Câmara | ✅ `camara-mesa-diretora`; cargos Senado (`/senador/{id}/cargos`) = **GAP NOVO** |
| G9 | Votações em comissão Senado | ✅ Implementado |
| G10 | Afastamentos de senadores | ✅ `senado-afastamentos`; `/senador/{id}/mandatos` (suplentes) não coberto |
| G11 | Mandatos externos Câmara | ✅ Implementado |
| G12 | Vetos presidenciais Senado | ✅ Implementado |
| G13 | Migração relatorias Senado | 🔴 **URGENTE** — script usa endpoint deprecated desde 2026-02-01 |
| G14 | Texto integral de discursos | ⏸ Bloqueado por decisão R2 vs Neon (Princípio 11) |

---

## 4. Gap novo descoberto no scan ao vivo da API

### G15 — Cargos em comissões do Senado (`/senador/{codigo}/cargos`)

**Confirmado ao vivo:** `GET /senador/{id}/cargos.json` retorna cargos formais com `nomeCargo`, `siglaComissao`, `dataInicio/Fim` e flag `ativo`. Exemplo real: senador Alan Rick presidindo a CRA (Comissão de Desenvolvimento Regional e Turismo).

**Valor de produto:** complementa o que a Câmara já mostra via `camara-mesa-diretora` — "Presidente da CCJ", "Vice-presidente da CRA". Badge de poder institucional no perfil do senador. Dado que o cidadão vê nos jornais e não encontra na plataforma.

**Custo:** ~81 senadores × 1 call = baixo. Schema não muda se `lideranca_cargo.tipo` (texto, per ADR-056) acomodar os novos valores.

---

## 5. Dados latentes — ingeridos, invisíveis ao cidadão

| Dado | Tabela/campo | Oportunidade |
|------|-------------|-------------|
| Partido no momento do voto | `voto_nominal.partido_sigla_voto` | Corrigir drawer de votos (BUG-1 acima) |
| Glosa de gasto | `gasto.valor_glosa` | Exibir "R$ X glosado" na tabela de gastos |
| Mediana de tramitação por tipo | `computeMedianaDiasPorTipo` (query pronta, nunca conectada) | Benchmark no detalhe da proposição: "este PL tramita X dias vs. mediana de Y" |
| KPI de vetos por senador | `getVetosStatsParlamentar` (query pronta, nunca conectada) | KpiStrip Sim/Não/Abstenção de vetos no perfil do senador |
| Composição dos blocos Gov/Oposição | `bloco_partidario.partidos` (text[]) | Tooltip contextual na seção de alinhamento |
| Lideranças históricas | `lideranca_cargo` com `data_fim IS NOT NULL` | Timeline colapsável de cargos passados |
| Gastos CEAP de anos anteriores | `gasto` (acumula anos; query hardcoded em `anoCorrente`) | Seletor de ano na seção de gastos |
| Ementa da matéria vetada | `veto.materia_vetada_ementa` (selecionada no tipo, nunca renderizada) | Exibir no detalhe do veto |
| Membros de frentes parlamentares | `frente_parlamentar + frente_membro` | Rota `/frentes` e `/frentes/[id]` |
| Mesa Diretora da Câmara | `lideranca_cargo` (tipo PRESIDENTE_MESA etc.) | Rota `/institucional/mesa-diretora` |

---

## 6. Assimetrias Câmara × Senado remanescentes

| Recurso | Câmara | Senado | Caminho |
|---------|--------|--------|---------|
| Gastos (cota parlamentar) | ✅ CEAP | ❌ | CEAPS — fonte distinta (Portal Transparência Senado, não `dadosabertos` API); wave dedicada |
| Presença física em sessões | ✅ `sessao_presenca` | ❌ | API Senado não expõe equivalente estruturado |
| Cargos em comissões | ✅ parcial via `mesa_diretora` | ❌ **G15** | `GET /senador/{id}/cargos` — Sprint 27 |
| Texto integral de discursos | URL na fonte | URL na fonte | Bloqueado — Grupo E, decisão R2 |
| Temas de proposição | ✅ `/temas` | ❌ | API Senado não entrega temas em `/processo` |
| Votos recebidos na eleição | ✅ (via tse_candidatura, campo qt_votos já no CSV) | ✅ (idem) | Campo não está no schema ainda — Sprint 28 |

---

## 7. Wave 12 proposta: "Superficialização e Paridade"

### Sprint 25 — Bugs factuais e dados latentes
**Zero nova ingestão. Zero migration. Zero nova tabela.**

| Item | Arquivo-alvo |
|------|-------------|
| Fix BUG-1: partido no momento do voto | `src/lib/queries/votacoes.ts`, `src/components/votacao/votos-drawer.tsx` |
| Conectar `getVetosStatsParlamentar` como KpiStrip no perfil do senador | `src/app/parlamentares/[id]/page.tsx`, novo componente KpiStrip vetos |
| Conectar `computeMedianaDiasPorTipo` no detalhe da proposição | `src/app/proposicoes/[tipo]/[numero]/[ano]/page.tsx` |
| Exibir `valor_glosa` na tabela de gastos detalhe | `src/app/parlamentares/[id]/gastos/page.tsx` |
| Condicionar `getPresencaFisica` a `casa === 'CAMARA'` | `src/app/parlamentares/[id]/page.tsx:339` (elimina fetch desnecessário para 81 senadores) |
| Seletor de ano em Gastos CEAP | query + componente select em `/parlamentares/[id]/gastos` |
| **Diagnóstico obrigatório:** `SELECT count(*) FROM filiacao_partidaria` em prod | Publicar no PR como evidência empírica (Princípio 13) |

**UX resultante:** dados precisos no momento que importa (partido no instante do voto), benchmark de tramitação, KPI de vetos, falsos-ausentes de presença eliminados.

---

### Sprint 26 — Entidades navegáveis
**Novas rotas sobre dados completamente ingeridos. Toda query nova valida com EXPLAIN ANALYZE (ADR-017).**

| Item | Rota nova / Componente |
|------|------------------------|
| Frentes parlamentares | `/frentes` (listagem) + `/frentes/[id]` (membros) — SSG revalidate 30d |
| Mesa Diretora da Câmara | `/institucional/mesa-diretora` — SSG revalidate 24h |
| Rankings: produção legislativa | `/rankings/proposicoes` (5ª entrada no índice) |
| Discursos no browse temático | Seção "Quem mais discursa neste tema" em `/temas/[codigo]` |
| Contexto dos blocos Gov/Oposição | Tooltip inline no perfil — sem nova rota |
| Lideranças históricas | Timeline colapsável em `LiderancasCargos` |

**UX resultante:** cidadão navega por causa política sem precisar conhecer o nome do parlamentar. Contexto semântico dos blocos torna o alinhamento Gov/Oposição interpretável.

---

### Sprint 27 — Paridade Senado (ingestão + migração urgente)

| Item | Prioridade |
|------|-----------|
| **URGENTE:** Migrar `senado-relatorias.ts` de `/senador/{codigo}/relatorias` (deprecated 2026-02-01) para `/processo/relatoria?codigoParlamentar={codigo}` — per ADR-060 | 🔴 |
| Implementar `ingestion/senado/cargos.ts` — `GET /senador/{id}/cargos` para ~81 senadores; persistir em `lideranca_cargo`; adicionar ao registry como `senado-cargos` (monthly, t1) | 🟠 |
| Confirmar CPF senadores em prod: `SELECT count(*) FROM parlamentar WHERE casa='SENADO' AND cpf IS NOT NULL`; se 0, implementar ADR-055 (match Levenshtein ≥ 0,90 contra `tse_candidatura cd_cargo=5`) | 🟠 |
| Exibir cargos em comissões do senador em `LiderancasCargos` | 🟡 |

**UX resultante:** relatorias do Senado com dados frescos e sem risco de interrupção. Perfil do senador completo com cargos que presidiu em comissões.

---

### Sprint 28 — Enriquecimento eleitoral

| Item |
|------|
| `ALTER TABLE tse_candidatura ADD COLUMN qt_votos_nominais integer` + re-ingestão backfill dos CSVs TSE 2014/2018/2022 |
| Exibir "eleito com 45.832 votos em 2022" em `CandidaturasEleitorais` (`src/components/parlamentar/candidaturas.tsx`) |
| Bloco "Movimentações recentes" em `/partidos/[sigla]` via `filiacao_partidaria` (condicional a prod ter dados) |
| Redação dos ADRs de escopo para presença em comissões — desbloqueando Sprint 29 ou Wave 13 |

---

### Sprint 29 — ADRs de comissões (planejamento puro)

**Zero código de feature. Objetivo: tomar as decisões que bloqueiam a maior expansão de cobertura disponível.**

| Decisão |
|---------|
| Escopo de presença em comissões: só reuniões deliberativas (1.709 eventos/2024) ou todas incluindo audiências (5.000+)? — validar empiricamente `GET /eventos/{id}/deputados` |
| Modelagem da pauta deliberativa: nova tabela `evento_pauta` ou extensão de `sessao`? |
| Avaliar bulk file `votacoesObjetos-{ano}.json` (60.948 registros/2024) como complemento ao `backfill-votacao-proposicao` |
| Estimativa de footprint Neon das novas tabelas antes de aprovar implementação |

---

## 8. Decisões arquiteturais necessárias antes de implementar

1. **`filiacao_partidaria` em prod** — executar `SELECT count(*)` ANTES da Sprint 25. Se 0 com crons ativos, diagnosticar falha silenciosa no GitHub Actions antes de qualquer outra ação.

2. **CPF do senador (G3)** — confirmar `SELECT count(*) FROM parlamentar WHERE casa='SENADO' AND cpf IS NOT NULL` em prod. Pré-requisito da Trilha Patrimonial Câmara+Senado (Eixo 2).

3. **Schema de `lideranca_cargo`** — verificar se coluna `tipo` como texto (não enum SQL, per ADR-056) acomoda `PRESIDENTE_COMISSAO`, `VICE_PRESIDENTE_COMISSAO`, `RELATOR_COMISSAO` sem migration.

4. **Escopo de presença em comissões** — a diferença entre "só reuniões deliberativas" e "todas as reuniões" muda o volume estimado de 1.709 para 5.000+ eventos/ano e afeta diretamente o footprint do Neon free tier.

5. **CEAPS Senado** — confirmar descarte definitivo ou investigar alternativa. Sem esta decisão, a assimetria de gastos Câmara vs. Senado permanece estrutural e sem comunicação ao cidadão.

---

## 9. Riscos operacionais

| Risco | Urgência |
|-------|---------|
| `senado-relatorias` usa endpoint deprecated desde 2026-02-01 — pode parar sem aviso em produção | 🔴 Imediato |
| `partido_sigla_voto` exibe dado factualmente incorreto em produção hoje | 🔴 Imediato |
| `filiacao_partidaria` com 0 linhas tornaria cálculos de fidelidade silenciosamente incorretos | 🟠 Alta |
| Cota Neon free tier: novos workloads (senado-cargos, eventual pauta) sem housekeeping podem re-esgotar como em junho/2026 | 🟠 Alta |
| CPF do senador com status incerto — Eixo 2 pode ser silenciosamente Câmara-only sem aviso ao cidadão | 🟡 Média |

---

## 10. O que foi descartado (e por quê)

| Item | Motivo |
|------|--------|
| CEAPS Senado via `dadosabertos` | HTTP 404 confirmado empiricamente — fonte distinta (Portal Transparência Senado); wave dedicada |
| Texto integral de discursos inline no Neon | Princípio 11 — texto longo → R2/CDN; decisão de arquitetura necessária antes |
| Taquigrafia e vídeos | Peso alto, valor marginal; sem endpoint estruturado |
| Presença/frequência em eventos (L3) | Derivada — "ausência" tem semântica ambígua sem contexto deliberativo |
| Tabelas de domínio (tipos de situação etc.) | Embutir como constantes no código |
| Proposições relacionadas | Vínculo derivado (L2), sem confronto factual direto |
