# ADR-061 — Escopo de presença em reuniões de comissão

| Campo | Valor |
|-------|-------|
| Status | accepted |
| Data | 2026-06-30 |
| Autor | FabioCaffarello |
| Decisores | FabioCaffarello |
| Relacionado | ADR-056 (lideranças/blocos/frentes), ADR-058 (afastamentos), ADR-062 (modelagem pauta) |

---

## Contexto

A Câmara publica eventos via `GET /api/v2/eventos`. Queremos exibir presença de deputados
em comissões no perfil do parlamentar. O endpoint `GET /eventos/{id}/deputados` retorna
os deputados vinculados ao evento.

### Probe empírico — 2026-06-30

```
GET https://dadosabertos.camara.leg.br/api/v2/eventos?dataInicio=2024-01-01&dataFim=2024-12-31&itens=1
X-Total-Count: 2623
```

**Volume total de eventos em 2024:** 2.623

Distribuição por tipo (amostra de 100 eventos, pág. 1):

| Tipo | Contagem na amostra | Estimativa ano |
|------|---------------------|----------------|
| Reunião de Instalação e Eleição | 31 | ~813 |
| Sessão Não Deliberativa Solene | 15 | ~394 |
| Reunião Técnica | 15 | ~394 |
| **Reunião Deliberativa** | **9** | **~236** |
| **Sessão Deliberativa** | **9** | **~236** |
| Seminário | 9 | ~236 |
| Audiência Pública | 1 | ~26 |
| Audiência Pública e Deliberação | 1 | ~26 |
| Outros (Painel, Visita, Debate, etc.) | 10 | ~263 |

**Eventos com caráter deliberativo** (Reunião Deliberativa + Sessão Deliberativa +
Audiência Pública e Deliberação): ~33% da amostra → ~**865–900 eventos/ano**.

```
GET https://dadosabertos.camara.leg.br/api/v2/eventos/71759/deputados
# Evento: Reunião Deliberativa, 2024-03-12
# Resultado: 50 deputados
```

**Estimativa de footprint** (opção A — só deliberativas):
- 865 eventos/ano × 50 deputados/evento = 43.250 rows/ano
- Row size estimado: ~200 bytes (3 UUIDs + timestamp + enum) → ~8,6 MB/ano
- 4 anos de cobertura (2023–2026): ~35 MB — dentro do free tier Neon (0,5 GB)

**Estimativa footprint** (opção B — todos os 2.623 eventos):
- 2.623 × 50 = 131.150 rows/ano → ~26 MB/ano → ~104 MB em 4 anos (viável mas apertado)

---

## Opções

### A — Só eventos com caráter deliberativo (ESCOLHIDA)

Filtro: `descricaoTipo IN ('Reunião Deliberativa', 'Sessão Deliberativa', 'Audiência Pública e Deliberação')`

- Volume: ~865 eventos/ano × ~50 deputados = ~43k rows/ano (~8,6 MB/ano)
- Footprint em 4 anos: ~35 MB — confortável no free tier
- Semântica clara: ausência = não estava lá quando havia votação ou deliberação formal
- Contra: exclui audiências públicas informativas (mas semântica de "ausência" lá é ambígua)

### B — Todos os 2.623 eventos

- Volume: ~131k rows/ano (~26 MB/ano)
- Footprint em 4 anos: ~104 MB (viável mas sem margem)
- Semântica ambígua: "ausente" numa reunião técnica não equivale a "não trabalhou"

### C — Só reuniões deliberativas de comissões permanentes (descartada)

- Exigiria JOIN contra cadastro de comissões para filtrar por tipo de órgão
- Complexidade de manutenção alta; a filtragem por `descricaoTipo` da opção A já
  é suficientemente restritiva

---

## Decisão

**Opção A.** Ingerir apenas eventos com `descricaoTipo` deliberativo.
Footprint de ~35 MB em 4 anos é sustentável no Neon free tier com margem.

A filtragem é feita no script de ingestão por string match em `descricaoTipo`
(não por `codTipoEvento` — o campo não é um código controlado na API v2).

---

## Consequências

- **Nova tabela** `evento_comissao_presenca` — modelagem em ADR-062.
- Script `ingestion/camara/presenca-comissoes.ts` — Sprint 30 (não Sprint 29).
- UI no perfil do parlamentar: seção "Presença em comissões" — Sprint 30.
- O Senado não publica endpoint equivalente; assimetria Câmara-only documentada
  em `docs/audits/2026-06-wave12-planejamento.md` §6.

## Evidência empírica (Princípio 13)

```
# Volume total
curl "https://dadosabertos.camara.leg.br/api/v2/eventos?dataInicio=2024-01-01&dataFim=2024-12-31&itens=1"
# X-Total-Count: 2623

# Deputados por evento deliberativo
curl "https://dadosabertos.camara.leg.br/api/v2/eventos/71759/deputados"
# count: 50 deputados (Reunião Deliberativa 2024-03-12)
```

Data do probe: 2026-06-30.
