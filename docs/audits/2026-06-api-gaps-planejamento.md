# Diagnóstico de gaps de API e planejamento de evolução

> Brasil a Vera · Auditoria · 2026-06-23
> Método: análise Swagger profunda (Câmara OpenAPI 3.0.1 `0.4.340` · 76 paths;
> Senado OpenAPI 3.1.0 · 157 operations / 9 tags) + mapeamento de cobertura da
> aplicação contra a ingestão atual.
> Esta auditoria sucede e atualiza `2026-06-cobertura-fontes.md` (2026-06-20).

---

## 1. Status dos gaps da auditoria anterior (G0–G4)

A auditoria de 2026-06-20 abriu issues #500–#504 para os gaps G0–G4.
O registro `ingestion/registry.ts` confirma o estado atual:

| Gap | Issue | Estado |
|-----|-------|--------|
| G0 — orientação de bancada Senado | #500 | ✅ **Resolvido** — `senado-orientacoes` no registry (tier 2, daily) |
| G1 — votação→proposição Senado | #501 | ✅ **Resolvido** — `senado-backfill-votacao-proposicao` no registry |
| G2 — filiação partidária | #502 | ✅ **Resolvido** — `camara-filiacoes` + `senado-filiacoes` no registry (monthly) |
| G3 — CPF do senador | #503 | ⚠️ **Status incerto** — `backfill:senado:bio` existe no registry; verificar se `parlamentar.cpf` é preenchido para senadores |
| G4 — discursos | #504 | ✅ **Resolvido** — `camara-discursos` + `senado-discursos` no registry (weekly, metadados) |

---

## 2. Estado atual da aplicação

### 2.1 Rotas disponíveis

| Rota | Dado surfaced |
|------|--------------|
| `/parlamentares` | Listagem + KPI strip (alinhamento, gastos) |
| `/parlamentares/[id]` | Hub 360: bio, orientação, fidelidade, comissões, relatorias, presença plenário, discursos, patrimônio, pares contraditórios, gastos |
| `/parlamentares/[id]/gastos` | Gastos CEAP detalhados |
| `/parlamentares/[id]/contradicao/[v1]/[v2]` | Card de fato — par contraditório (ADR-054) |
| `/proposicoes` | Listagem + filtros |
| `/proposicoes/[tipo]/[numero]/[ano]` | Detalhe: ementa, tramitação, autores, temas |
| `/votacoes` | Listagem + filtros |
| `/votacoes/[id]` | Votos nominais + orientação de bancada + proposição vinculada |
| `/partidos` / `/partidos/[sigla]` | Agregados + fidelidade + filiação |
| `/temas` / `/temas/[codigo]` | Browse temático |
| `/comparar` | Alinhamento e coerência entre parlamentares |
| `/busca` | Full-text |
| `/quem-me-representa` | Por UF |

### 2.2 Dado ingested × surfaced

**✅ Totalmente surfaced:** parlamentar, proposicao+tramitacao+autor+tema+relatoria,
votacao+voto_nominal+orientacao_bancada, gasto, bem_candidato (patrimônio),
membro_comissao, discurso (metadados), sessao_presenca, filiacao_partidaria,
estatistica_parlamentar_agregada, estatistica_proposicao_agregada, bio.

**🔶 Parcialmente surfaced (oportunidade imediata, sem nova ingestão):**

| Dado | Onde aparece | Onde falta |
|------|-------------|-----------|
| `relatoria` | Perfil do parlamentar | Página de proposição (leitor não vê o relator) |
| `discurso` | Perfil (seção) | Sem listing, sem browse por tema |
| `sessao_presenca` | Câmara-only no perfil | Senado não tem equivalente → assimetria |
| `tse_candidatura` | Apenas para join CPF→bens | Votos recebidos, coligação, partido na eleição |
| variação patrimonial ranking | Queries existem (`getVariacaoPatrimonialRanking`) | Nenhuma rota de leaderboard consome |
| `filiacao_partidaria` | Só dentro de fidelidade/partidos | Sem view histórica cross-house |

---

## 3. Novos gaps descobertos — análise Swagger profunda

### 3.1 GAPS — Alto valor (ambas as casas)

#### G5 — Lideranças partidárias e de governo

| Casa | Endpoint | Dado |
|------|----------|------|
| Câmara | `/partidos/{id}/lideres`, `/legislaturas/{id}/lideres` | Líder, vice-líder, representante por partido/bloco/bancada e por posição (governo, oposição, minoria) com vigência |
| Senado | `/composicao/lideranca` (substitui `/senador/{codigo}/liderancas` deprecated) | Líderes de partido/bloco/governo/oposição SF+CN, com vigência |

**Valor de produto:** badge "Líder do PT", "Líder do governo", "Líder da oposição"
no perfil e nos cards. Explica orientações de bancada que já temos. Dado de
alta visibilidade e baixíssimo volume (dezenas de registros por legislatura).

**Custo:** simples — baixa cardinalidade, quase-estático → cron mensal.

---

#### G6 — Blocos parlamentares

| Casa | Endpoint | Dado |
|------|----------|------|
| Câmara | `/blocos`, `/blocos/{id}/partidos` | Blocos por legislatura, partidos que compõem cada bloco |
| Senado | `/composicao/lista/blocos`, `/composicao/bloco/{codigo}` | Mesma estrutura |

**Valor de produto:** fecha o loop semântico das orientações de bancada (orientação
já ingerida diz "bloco X votou SIM" — o usuário não sabe o que é esse bloco sem
esta tabela). Mapeia coligações de plenário. Dado praticamente estático.

**Custo:** trivial — muito poucos registros.

---

#### G7 — Frentes parlamentares (Câmara)

| Endpoint | Dado |
|----------|------|
| `/frentes`, `/frentes/{id}`, `/frentes/{id}/membros` | Frentes temáticas (agronegócio, evangélica, direitos humanos…) + membros e papéis |
| `/deputados/{id}/frentes` | Frentes às quais o deputado pertence |

**Valor de produto:** revela alinhamentos temáticos de bastidor que o voto nominal
não captura. "Frentes às quais pertence" já está previsto em PARLAMENTAR-360.md
mas não ingerido. Dados sobre quais causas o parlamentar apoia formalmente.

**Custo:** simples no topo (`/frentes` paginado); médio em membros (1 call/frente).

---

#### G8 — Mesa Diretora e cargos institucionais

| Casa | Endpoint | Dado |
|------|----------|------|
| Câmara | `/legislaturas/{id}/mesa` | Presidente, vice-presidentes, secretários da Câmara por legislatura |
| Senado | `/senador/{codigo}/cargos` | Cargos do senador (presidente de comissão, membro da Mesa do Senado) com flag `ativo` |

**Valor de produto:** "Presidente da Câmara", "Presidente da CCJ" como badges
de poder institucional. Muito distinto de liderança partidária — é cargo
formal dentro da estrutura da Casa.

**Custo:** trivial (Câmara: 1–2 calls/legislatura; Senado: 1/senador).

---

#### G9 — Votações em comissão do Senado

| Endpoint | Dado |
|----------|------|
| `/votacaoComissao/parlamentar/{codigo}` | Votos do senador em comissão |
| `/votacaoComissao/materia/{sigla}/{num}/{ano}` | Votações de comissão de uma matéria |
| `/votacaoComissao/comissao/{sigla}` | Votações de uma comissão específica |

**Valor de produto:** hoje só temos votações de **plenário**. A maioria das
proposições morre ou avança em comissão, nunca chegando ao plenário. Este gap
é a diferença entre "como votou na comissão" (onde há poder real de agenda) e
"como votou no plenário" (onde o resultado já está formatado).

**Custo:** média-alta — 3 vetores de acesso, votos nominais inline, precisa
definir janela temporal e estratégia de merge com o modelo de votação existente.

---

### 3.2 GAPS — Médio valor

#### G10 — Mandatos e afastamentos de senadores

| Endpoint | Dado |
|----------|------|
| `/senador/{codigo}/mandatos` | Períodos de mandato (titular/suplente) |
| `/senador/{codigo}/licencas` | Licenças oficiais |
| `/senador/afastados` | Lista de senadores afastados no momento |

**Valor de produto:** explica por que um senador não votou (afastado/licenciado),
reduzindo o falso "ausente" nas votações. Identifica suplentes que estão
efetivamente ocupando a cadeira.

**Custo:** simples — endpoint por senador, baixa cardinalidade.

---

#### G11 — Carreira política anterior (mandatos externos Câmara)

| Endpoint | Dado |
|----------|------|
| `/deputados/{id}/mandatosExternos` | Cargos eletivos anteriores (vereador, prefeito, dep. estadual) — fonte TSE |

**Valor de produto:** "Carreira política" no perfil — trajetória do político
antes do mandato atual. Casa com Eixo 2 (bens TSE). Marcado como
"autodeclarado/TSE" — não é inferência nossa.

**Custo:** complexa (loop por deputado ~513), mas 1 call/deputado.
**Nota da API:** dado marcado como "há problemas de estruturação" — Zod tolerante necessário.

---

#### G12 — Vetos presidenciais (Senado)

| Endpoint | Dado |
|----------|------|
| `/materia/vetos/{ano}` | Lista de vetos presidenciais no ano |
| `/plenario/resultado/veto/*` | Como cada senador votou na apreciação do veto |

**Valor de produto:** vetos são eventos políticos de altíssima visibilidade.
"Como seu senador votou na derrubada do veto X" é uma das perguntas de maior
tração pública. Dado único — não há equivalente no cluster `/processo`.

**Custo:** média — único cluster do `/materia/*` deprecated que ainda tem valor
real (sem equivalente em `/processo`).

---

#### G13 — Migração relatorias Senado para endpoint canônico

| Endpoint atual (deprecated) | Substituto |
|-----------------------------|-----------|
| `/senador/{codigo}/relatorias` | `/processo/relatoria` (filtros: `idProcesso`, `codigoParlamentar`, `dataReferencia`) |

**Valor de produto:** qualidade de dado, não feature nova. O endpoint atual é
legado e pode ser descontinuado. A migração preserva a cobertura existente.

**Custo:** baixa — substituição de endpoint no script existente.

---

#### G14 — Texto integral de discursos (Senado)

| Endpoint | Dado |
|----------|------|
| `/plenario/lista/discursos/{dataInicio}/{dataFim}` | Discursos por período |
| `/discurso/texto-integral/{cod}` | Texto completo do pronunciamento |

**Valor de produto:** habilita busca e citação de conteúdo. Hoje só temos
metadados.

**⚠️ Princípio 11 (CLAUDE.md):** texto longo → armazenar URL + fetch on-demand,
nunca inline no banco. Custo de R2/CDN precisa ser avaliado antes de implementar.

---

### 3.3 GAPS descartados (não vale ingerir)

| Gap | Por quê |
|-----|---------|
| Ocupações/profissões autodeclaradas (Câmara) | Autodeclarado, baixo confronto factual; `/mandatosExternos` tem fonte TSE e é mais confiável |
| Agenda/pauta de eventos | Dado efêmero (próximos 30d); a plataforma é retrospectiva |
| Proposições relacionadas | Vínculo derivado (L2), sem confronto direto |
| `/legislacao/*` Senado | Catálogo de normas — fora do escopo "o que seu representante faz" |
| Taquigrafia/vídeos | Peso alto, valor marginal vs. texto |
| Tabelas de domínio (tipos, situações, decisões) | Embutir como constantes, não ingestão viva |
| CEAPS Senado (gastos) | Fonte distinta do Portal Transparência Senado; esforço alto — avaliar numa wave dedicada |
| Histórico acadêmico/profissão Senado | Autodeclarado, baixo confronto factual |

---

## 4. Superfícies de dados já ingeridos (sem nova ingestão)

Estas são oportunidades de UI/query puras — dado já no banco, feature não exposta:

| Oportunidade | Esforço | Impacto |
|-------------|---------|---------|
| **Relator na página de proposição** — dado em `relatoria`, só aparece no perfil do parlamentar; leitor de proposição não vê | Baixo (query + UI) | Alto — fecha o loop bidirecional |
| **Leaderboard de variação patrimonial** — queries `getVariacaoPatrimonialRanking` e `getCoerenciaStats` existem, nenhuma rota as consome | Baixo (rota nova) | Médio |
| **Candidatura TSE** — `tse_candidatura` tem votos recebidos, coligação, partido na eleição; usado só para join CPF→bens | Médio (UI nova) | Médio — "como foi eleito" |
| **Fidelidade/histórico de filiação cross-house** | Médio (view nova) | Médio |

---

## 5. Priorização e proposta de wave

### Critérios
- **Valor/custo** = impacto no usuário por unidade de esforço de ingestão
- **Coerência** = dados que fecham loops semânticos de features já entregues
- **Footprint** = disciplina Neon scale-to-zero (conjuntos pequenos primeiro)

### Agrupamentos propostos

#### Grupo A — Estruturas de poder (máxima prioridade)
*Quick win: conjuntos pequenos, quase-estáticos, altíssimo valor narrativo.*

- G5 — Lideranças (Câmara + Senado)
- G6 — Blocos parlamentares (Câmara + Senado)
- G7 — Frentes parlamentares (Câmara)
- G8 — Mesa Diretora e cargos institucionais
- **Superfície imediata:** relator na página de proposição

**UX resultante:**
- Badge "Líder do PT / Senado" nos cards e no perfil
- Seção "Poder na Casa" no perfil do parlamentar
- Frentes parlamentares como seção do perfil (já previsto em PARLAMENTAR-360)
- Relator visível na página da proposição (bidireccional)
- Contexto de blocos para entender as orientações de bancada

#### Grupo B — Qualidade de dados e simetria bicameral
*Sem feature nova — corrige assimetrias e dados frágeis.*

- G10 — Mandatos e afastamentos de senadores
- G13 — Migração relatorias Senado para `/processo/relatoria`
- G3 (parcial) — Confirmar/fixar CPF de senadores para Eixo 2

**UX resultante:**
- "Afastado/licenciado" no perfil de senadores (elimina falso "ausente")
- Qualidade de dados de relatorias sem dependência de endpoint deprecated

#### Grupo C — Votações em comissão (ganho de cobertura)
*Maior salto de profundidade legislativa — onde as decisões reais acontecem.*

- G9 — Votações em comissão do Senado

**UX resultante:**
- Seção "votações em comissão" no perfil do senador
- "Como o senador votou na comissão" na página de proposição
- Alinhamento em comissão (complementa alinhamento em plenário)

#### Grupo D — Carreira política e eventos públicos
*Contexto histórico e eventos de alta visibilidade.*

- G11 — Mandatos externos Câmara (carreira pré-Câmara)
- G12 — Vetos presidenciais Senado
- Leaderboard patrimonial (superfície de dados existentes)

**UX resultante:**
- Seção "Antes do mandato atual" no perfil
- Feed de vetos + "como seu representante votou"
- Ranking de variação patrimonial

#### Grupo E — Conteúdo textual (decisão de arquitetura necessária)
*Depende da decisão sobre R2/CDN antes de implementar (Princípio 11).*

- G14 — Texto integral de discursos (Senado)

---

## 6. Assimetrias Câmara × Senado persistentes

Após o Grupo A+B, as assimetrias restantes serão:

| Recurso | Câmara | Senado | Caminho |
|---------|--------|--------|---------|
| Gastos (cota parlamentar) | ✅ CEAP | ❌ | CEAPS — fonte distinta, wave dedicada |
| Presença física em sessões | ✅ `sessao_presenca` | ❌ | API Senado não expõe equivalente público |
| Texto integral de discursos | URL na fonte | URL na fonte | Grupo E (decisão R2) |
| Temas de proposição | ✅ (`/temas`) | ❌ | API Senado não entrega temas em `/processo` |
| Votações em comissão | ❌ (não mapeado na Câmara) | Grupo C (Senado) | Câmara expõe via `/orgaos/{id}/votacoes` — avaliar na mesma sprint |

---

## 7. Próximos passos concretos

1. **Confirmar G3 (CPF senadores):** rodar `backfill:senado:bio` localmente e
   verificar se `parlamentar.cpf` está sendo preenchido para senadores. Se não,
   o Eixo 2 (TSE bens) continua Câmara-only.

2. **Abrir issues para Grupo A:** uma issue por gap (G5, G6, G7, G8) mais a
   superfície "relator na proposição". Grupo A é candidato à próxima sprint.

3. **ADR para Grupo C:** votações em comissão muda o modelo de dados de votação
   (nova tabela ou extensão de `votacao`?). Decidir antes de implementar.

4. **Validar endpoint Câmara `/orgaos/{id}/votacoes`:** verificar se expõe votos
   nominais de comissão (Câmara) para simetria com G9 (Senado).

5. **Decisão de arquitetura texto longo:** antes do Grupo E, definir se discursos
   e vetos usam R2 + URL on-demand ou se o volume é pequeno o suficiente para
   caber no Neon (princípio 11).
