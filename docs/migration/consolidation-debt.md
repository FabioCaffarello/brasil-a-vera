# Dívida de consolidação — cópias-rds vs originais de produção

> Branch `feat/migrate-partidos-rds-pilot` · Read-only
>
> Esta página registra os componentes duplicados sob `/rds/` durante as
> migrações rota-a-rota. Cada par é uma cópia-rds que precisará ser
> consolidada quando a rota correspondente for promovida (cópia-rds vira a
> versão única; original deletado). Enquanto isso não acontece, **mudança
> num lado precisa ser espelhada no outro** — risco de drift.

## Como ler a tabela

- **Original** vive em `src/components/...`. **Intocada** pela migração.
- **Cópia-rds** vive sob `src/app/rds/<rota>/_components/...`. É uma
  tradução do original com tokens RDS + uso seletivo do `<Text>` (regra
  em `docs/migration/token-map.md` §"Como aplicar").
- **Risco de drift**:
  - **baixo** — componente estável que não muda há sprints; pouca
    chance de divergência.
  - **médio** — lógica não-trivial ou estilo que costuma evoluir;
    qualquer PR que toque o original precisa lembrar de espelhar.
  - **alto** — lógica complexa, partilhada com outras rotas, ou
    mudança recente. **Evitar duplicar** se não for absolutamente
    necessário.

## Pares ativos

### Rota piloto — `/rds/partidos/[sigla]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/partido/header.tsx` | `src/app/rds/partidos/[sigla]/_components/partido-header.tsx` | baixo | header simples (eyebrow + h1 + 2 subtítulos); typography custom no h1, demais via `<Text>` |
| `src/components/partido/bancada-list.tsx` | `src/app/rds/partidos/[sigla]/_components/bancada-list.tsx` | médio | layout de card-link com hover/focus; `<img>` cru preservado para zero-JS |
| `src/components/partido/fidelidade-media.tsx` | `src/app/rds/partidos/[sigla]/_components/fidelidade-media.tsx` | médio | **lógica de limiares de cor preservada exata** (≥80 success / ≥50 foreground / <50 warning); padrão "3 limiares" replicado em outras 3 rotas (registro na matriz) |
| `src/components/partido/top-temas.tsx` | `src/app/rds/partidos/[sigla]/_components/top-temas.tsx` | baixo | `<ol>` simples com tema + contagem |
| `src/components/partido/gasto-bancada.tsx` | `src/app/rds/partidos/[sigla]/_components/gasto-bancada.tsx` | médio | formatBRL importado; lógica de estado-vazio preservada |

Helper local `<Section>` do `page.tsx` original NÃO virou arquivo separado
nem no original nem na cópia. Na cópia-rds, foi reconstruído usando `<Card>`
do `/server` + `<Text>` para hint + `<h2>` cru para título.

## Política de espelhamento (enquanto a dívida existir)

1. **Modificar o original** (`src/components/partido/*.tsx`) sem espelhar:
   o original muda em produção, a cópia-rds não. Aceitável a curto prazo
   (a rota /rds/ é staging, não produção).
2. **Modificar a cópia-rds** sem espelhar: deformação na rota staging que
   não reflete a real. Evitar — qualquer ajuste descoberto na piloto
   deveria virar PR de consolidação ou ser portado pro original.
3. **Mudança estrutural** (rename, prop change): PARAR a migração e
   reavaliar — pode ser sinal de que a estratégia de duplicação esgotou
   sua utilidade para essa peça.

## Consolidação (quando uma rota é promovida)

Promoção = rota `/rds/X` substitui a rota `/X` em produção. No momento da
promoção:

1. Mover o conteúdo do `_components/` da rota piloto para o local de
   produção (`src/components/<área>/`).
2. Deletar o original.
3. Atualizar os imports nos demais consumidores (se houver — o usual é
   que cópias-rds só sirvam à rota piloto).
4. Rodar build + dev para confirmar.
5. Remover a entrada desta tabela.

## Observações da rota piloto

- **`BancadaList` não estava catalogada na matriz** (omissão herdada do
  inventário em `docs/migration/component-inventory.md`). Registrar como
  nota de correção na matriz (ver §"correções pendentes").
- **`p-5` vs `p-4` no Card**: o original usa `p-5` (20px); o `<Card>` do
  RDS com `padding="medium"` (default) renderiza `p-4` (16px). Diferença
  de 4px — sub-perceptual. Aceito. Se acumular nas migrações futuras,
  considerar passar `padding="large"` (renderiza `p-6` = 24px, ligeiramente
  maior) ou trocar `<Card>` por `<div>` cru com classes traduzidas.

## Correções pendentes à matriz

- **`BancadaList`** (`src/components/partido/bancada-list.tsx`): cat. 4
  (domain-coupled — `PartidoMembro` no contrato). Usos: 1 arquivo / 1 site
  (`/partidos/[sigla]`). Estilo: Tailwind com tokens semânticos do BaV
  (`bg-surface`, `border-border{,-strong}`, `text-foreground{,-muted}`,
  `ring-ring`).

Adicionar na próxima atualização de `docs/migration/migration-matrix.md`.
