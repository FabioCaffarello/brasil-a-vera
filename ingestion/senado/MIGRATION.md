# Migração pendente: `/materia/atualizadas` → `/processo`

## Status

O endpoint `/materia/atualizadas?numdias={N}` foi oficialmente descontinuado em
**01/02/2026** (comunicado via `Metadados.Descontinuacao` na própria resposta da API).

O endpoint atual ainda responde em **período de grace**, mas a substituição oficial é:

- **Novo endpoint**: `https://legis.senado.leg.br/dadosabertos/processo`
- **Estrutura**: a confirmar via fetch real (ainda não mapeada no código)

## Plano

1. Fazer uma chamada exploratória ao novo endpoint:
   ```bash
   curl -s -H 'Accept: application/json' \
     'https://legis.senado.leg.br/dadosabertos/processo?desde=2026-04-01' \
     | jq . | head -200
   ```
2. Criar tipos `SenadoProcessoAtualizado` em `senado-types.ts`
3. Criar novo script `sync-processos.ts` paralelo ao `sync-materias.ts`
4. Validar contra ingestão anterior (amostras: comparar contagens e primeiras N matérias)
5. Trocar `ingest:materias:senado` para apontar para o novo script (manter o nome do script npm)
6. Remover `sync-materias.ts` legado e os tipos `SenadoListaMateriasAtualizadasResponse` / `SenadoMateriaAtualizada`

## Por que não migrar agora

Sem confirmação da estrutura de resposta via fetch real, migração cega
quebraria o sync ao invés de ajustar. O endpoint antigo ainda responde em grace
period — preferimos um sync funcionando hoje a uma migração mal-mapeada.

O `sync-materias.ts` atual loga `error` (em vez de `warn`) quando detecta que o
endpoint passou da `DataDesativacaoCompleta` — é o sinal para acionar este plano.
