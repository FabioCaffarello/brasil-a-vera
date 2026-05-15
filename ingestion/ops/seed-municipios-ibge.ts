// Gera src/lib/municipios-ibge.json a partir da API oficial do IBGE.
//
// Execução manual, one-off (Sprint 3.1 Tarefa 1). O dataset do IBGE é
// extremamente estável (a última criação/extinção de município no Brasil
// foi em 2013) — não cabe em cron. Re-rodar apenas quando o IBGE publicar
// alteração relevante de divisão territorial.
//
// Uso:
//   npx tsx --tsconfig tsconfig.ingestion.json ingestion/ops/seed-municipios-ibge.ts
//
// Idempotente. Resultado é commitado em src/lib/municipios-ibge.json e
// importado por src/lib/municipios.ts.

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

const SOURCE_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'

const OUTPUT_PATH = resolve(__dirname, '../../src/lib/municipios-ibge.json')

// Estrutura completa da resposta IBGE é aninhada (microrregiao →
// mesorregiao → UF → regiao). Aqui validamos só o que precisamos.
const ibgeMunicipioSchema = z
  .object({
    id: z.number().int(),
    nome: z.string().min(1),
    'regiao-imediata': z
      .object({
        'regiao-intermediaria': z
          .object({
            UF: z.object({
              sigla: z.string().length(2),
            }),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

interface MunicipioNormalizado {
  id: number
  nome: string
  uf: string
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}...`)
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`IBGE retornou status ${response.status}`)
  }
  const data = (await response.json()) as unknown[]
  console.log(`Recebidos ${data.length} municípios brutos`)

  const normalizados: MunicipioNormalizado[] = []
  let skipped = 0
  for (const raw of data) {
    const parsed = ibgeMunicipioSchema.safeParse(raw)
    if (!parsed.success) {
      skipped++
      continue
    }
    normalizados.push({
      id: parsed.data.id,
      nome: parsed.data.nome,
      uf: parsed.data['regiao-imediata']['regiao-intermediaria'].UF.sigla,
    })
  }

  // Ordem determinística: UF asc, depois nome asc. Diffs entre regerações
  // ficam mínimos (só linhas inseridas, não reordenação).
  normalizados.sort((a, b) => {
    if (a.uf !== b.uf) return a.uf.localeCompare(b.uf)
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  // JSON compacto (sem indent) para minimizar bundle size; ~5571 linhas
  // viraria muito ruído em diff sem ganho semântico.
  const json = JSON.stringify(normalizados)
  writeFileSync(OUTPUT_PATH, `${json}\n`)

  const bytes = json.length
  const ufsCount = new Set(normalizados.map((m) => m.uf)).size
  console.log(
    JSON.stringify(
      {
        event: 'seed_municipios_done',
        total: normalizados.length,
        skipped,
        ufs: ufsCount,
        bytes,
        path: OUTPUT_PATH,
      },
      null,
      2,
    ),
  )

  if (ufsCount !== 27) {
    throw new Error(`Esperava 27 UFs, recebi ${ufsCount}`)
  }
  if (normalizados.length < 5000) {
    throw new Error(`Esperava ~5570 municípios, recebi ${normalizados.length}`)
  }
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
