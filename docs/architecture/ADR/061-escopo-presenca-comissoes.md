# ADR-061 — Escopo de presença em reuniões de comissão

| Campo | Valor |
|-------|-------|
| Status | proposed |
| Data | 2026-06-30 |
| Autor | FabioCaffarello |
| Decisores | FabioCaffarello |
| Relacionado | ADR-056 (lideranças/blocos/frentes), ADR-058 (afastamentos) |

---

## Contexto

A Câmara publica dois tipos de evento em `GET /eventos`:

- **Reuniões deliberativas** (~1.709 eventos/2024) — sessões onde votações formais ocorrem; presença tem alta saliência cívica.
- **Audiências públicas, comissões gerais e outros eventos** (~5.000+/2024) — preparatórias ou informativas; presença tem valor de transparência, mas semântica de "ausência" é ambígua (parlamentar pode ter participado do debate sem assinar presença na lista formal).

`GET /eventos/{id}/deputados` retorna a lista de deputados vinculados ao evento. Este endpoint não distingue "presente na reunião deliberativa" de "listado como membro naquele dia". A interpretação depende do tipo de evento.

O Senado não publica endpoint equivalente estruturado para presença em comissões.

## Opções

### A — Só reuniões deliberativas (scope restrito)

- Volume: ~1.709 eventos/ano × ~20 deputados/comissão = ~34.000 rows/ano
- Footprint Neon estimado: ~5 MB/ano
- Semântica clara: ausência = não estava lá quando havia votação
- Contras: subestima participação em audiências (comissão pode ser ativa sem deliberar)

### B — Todos os tipos de evento

- Volume: ~5.000+ eventos/ano × ~20 = ~100.000 rows/ano
- Footprint Neon: ~15 MB/ano (acima do budget de 0.5 GB free tier se acumulado por mais de 10 anos)
- Semântica ambígua: ausência numa audiência pública pode ser intencional ou não registrada
- Contras: inflaciona a tabela sem evidência de que o dado adicional seja interpretável

### C — Reuniões deliberativas + filtro por comissão temática permanente

- Exclui Plenário, sessões conjuntas, CPIs encerradas
- Volume: ~800–1.200 eventos/ano
- Semântica mais limpa, menor footprint
- Contras: lógica de filtro precisa de manutenção quando novas comissões são criadas

## Decisão pendente

**Gate para implementação:** antes de qualquer código, verificar empiricamente:

1. `curl https://dadosabertos.camara.leg.br/api/v2/eventos?dataInicio=2024-01-01&dataFim=2024-12-31&codSituacao=REALIZADA | jq '.dados | length'` — confirmar volume real de eventos realizados em 2024

2. `curl https://dadosabertos.camara.leg.br/api/v2/eventos/{id}/deputados | jq '.dados | length'` — confirmar que o endpoint retorna lista de deputados (não só membros) para eventos deliberativos

3. Estimativa empírica de footprint: `rows = eventos × deputados_por_evento × anos_retidos`

## Consequências

- **Enquanto em `proposed`:** nenhum código de ingestão de presença em comissões será escrito.
- **Após aceito (opção A ou C):** Sprint 29 pode implementar a tabela `evento_comissao_presenca`, o script de ingestão e a UI na página do parlamentar.
- **Se rejeitado / descartado:** o dado de presença em comissões permanece fora do escopo do produto; seção de afastamentos (`afastamento_senador`) continua como único proxy de ausência justificada.

## Critério de aprovação

Evidência empírica (curl + contagem de rows) anexada no PR que mudar este ADR de `proposed` para `accepted`. Sem evidência = sem merge.
