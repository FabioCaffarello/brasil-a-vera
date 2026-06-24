# ADR-059 — Vetos presidenciais e votos do Congresso

**Status:** Accepted
**Data:** 2026-06-24
**Sprint:** 13.2 (G12 da auditoria de lacunas)

---

## Contexto

A auditoria de cobertura de fontes (jun/2026) identificou que o Congresso Nacional
vota a manutenção ou derrubada de vetos presidenciais em sessões conjuntas — e esses
votos não estão capturados no banco. São votações com alto valor narrativo ("seu
senador votou para derrubar o veto que cancelou X") mas que envolvem uma entidade
diferente do voto plenário comum: o veto é proposta do Executivo votada em conjunto
por Câmara + Senado (Congresso Nacional).

**Endpoints confirmados empiricamente (2026-06-24):**
```
GET /materia/vetos/{ano}                             → lista vetos do ano
GET /plenario/resultado/veto/materia/{materiaCodigo} → dispositivos + situação
GET /plenario/resultado/veto/dispositivo/{codigo}    → votos nominais CN (Câmara + Senado)
```

**Achados do probe:**
- ~50 vetos/ano; ~2–3 dispositivos por veto em média
- `TipoVotacao: "Cédula"` (votação por cédula física em sessão conjunta)
- Votos por nome (`NomeParlamentar`, `PartidoParlamentar`, `UfParlamentar`) — sem ID
- Câmara + Senado votam separados dentro da mesma chamada (chaves `Camara` / `Senado`)
- `Situacao` por dispositivo: "Mantido" / "Rejeitado" / ausente se em tramitação

---

## Decisão

### Tabelas

**`vetos.veto`** — uma linha por VET (número/ano único):
- `source_id` (Veto.Codigo) — chave natural única
- Metadados: número, ano, ementa, veto total/parcial, assunto, datas
- Matéria vetada: sigla (PL, PLC…), número, ano, ementa

**`vetos.dispositivo_veto`** — um artigo/trecho vetado por linha:
- FK `veto_id → vetos.veto`
- `source_id` (Dispositivo.Codigo) — chave natural única
- `identificador` (ex: "49.24.001"), `situacao` ("Mantido"/"Rejeitado"), `data_sessao`

**`vetos.voto_veto`** — voto nominal por dispositivo, Senado-only:
- FK `dispositivo_id → vetos.dispositivo_veto`
- `parlamentar_id` nullable (match por nome+UF; falha → NULL)
- `nome_raw`, `partido_raw`, `uf_raw` preservados para auditoria
- `voto` text normalizado: "SIM" / "NAO" / "ABSTENCAO"
- Chave natural: `(dispositivo_id, nome_raw, 'SENADO')`

**Por que Senado-only na ingestão de votos:**
- Target da feature é "como SEU SENADOR votou"
- Câmara tem ~500 parlamentares — match por nome é menos confiável
- Câmara já tem votações plenárias; vetos em comissão são Senado-driven
- Os 81 senadores são match confiável por nome+UF

### Trust e cache
- Trust L1 (API primária do Senado/Congresso Nacional)
- `TTL.vetos = 86_400` (24h) — vetos raramente mudam de situação intraday
- Janela de ingestão: anos [2023..ano_corrente] — legislatura em exercício

### Ingestion
- Chain 3-níveis: lista-vetos → dispositivos → votos (por dispositivo)
- `CONCURRENCY=1`, `PACING_MS=200` entre chamadas
- Upsert em todos os níveis por source_id
- Match `parlamentar_id`: `SELECT id FROM parlamentares.parlamentar WHERE LOWER(nome) = LOWER($1) AND uf = $2 AND casa = 'SENADO'` — nullable se zero ou múltiplos

---

## Consequências

- Cidadão vê "Veto X — Mantido/Rejeitado — seu senador votou SIM/NÃO"
- Senadores sem match no banco ficam com `parlamentar_id NULL` e `nome_raw` preservado
- Câmara-only para votos: trade-off consciente por confiabilidade do match
- ~4 anos × ~50 vetos × ~3 dispositivos = ~600 chamadas por run completo; manejável
