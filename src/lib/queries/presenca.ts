import { sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  calcularPresenca,
  type PresencaStats,
} from '@/modules/votacoes/domain/presenca'
import { db } from '@/shared/db'

// Presença em votações nominais de plenário (Eixo 1, ADR-045).
//
// Denominador = votações de plenário (`orgao = 'PLEN'`) da casa do parlamentar,
// COM voto nominal (exclui simbólicas), na JANELA DE MANDATO — aproximada pela
// primeira/última participação do parlamentar (fail-closed: votações fora do
// mandato não inflam ausência). Presente = voto registrado ≠ AUSENTE.
//
// Câmara infere ausência (sem linha numa nominal de plenário = faltou); Senado
// registra AUSENTE. A mesma fórmula serve as duas casas (a nota de método é da
// UI). Cache de edge 24h (ADR-018). Substitui o cálculo incorreto de presença
// do /comparar (ver getPresencaPlenarioBatch).

const PLENARIO = 'PLEN'

interface PresencaRow {
  elegiveis: number | string
  presentes: number | string
}

// SQL compartilhada: para um conjunto de parlamentares, conta elegíveis e
// presentes por parlamentar, cada um na SUA janela. Usada pelo perfil (1 id) e
// pelo /comparar (N ids).
async function fetchPresenca(
  parlamentarIds: string[],
): Promise<Map<string, PresencaStats>> {
  const result = new Map<string, PresencaStats>()
  if (parlamentarIds.length === 0) return result

  const ids = sql.join(
    parlamentarIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  )

  // Por parlamentar: janela [min,max] das suas participações; elegíveis =
  // votações PLEN nominais da sua casa na janela; presentes = elegíveis com
  // voto ≠ AUSENTE do parlamentar.
  const rows = (
    await db.execute(sql`
      WITH alvo AS (
        SELECT p.id, p.casa
        FROM parlamentares.parlamentar p
        WHERE p.id IN (${ids})
      ),
      win AS (
        SELECT vn.parlamentar_id AS pid,
               min(v.data_hora) AS lo,
               max(v.data_hora) AS hi
        FROM votacoes.voto_nominal vn
        JOIN votacoes.votacao v ON v.id = vn.votacao_id
        WHERE vn.parlamentar_id IN (${ids})
        GROUP BY vn.parlamentar_id
      ),
      elegiveis AS (
        SELECT a.id AS pid, v.id AS votacao_id
        FROM alvo a
        JOIN win w ON w.pid = a.id
        JOIN votacoes.votacao v
          ON v.casa = a.casa
         AND v.orgao = ${PLENARIO}
         AND v.data_hora BETWEEN w.lo AND w.hi
        WHERE EXISTS (
          SELECT 1 FROM votacoes.voto_nominal vn2 WHERE vn2.votacao_id = v.id
        )
      )
      SELECT
        a.id AS parlamentar_id,
        count(e.votacao_id)::int AS elegiveis,
        count(e.votacao_id) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM votacoes.voto_nominal vn
            WHERE vn.votacao_id = e.votacao_id
              AND vn.parlamentar_id = a.id
              AND vn.voto <> 'AUSENTE'
          )
        )::int AS presentes
      FROM alvo a
      LEFT JOIN elegiveis e ON e.pid = a.id
      GROUP BY a.id
    `)
  ).rows as unknown as Array<PresencaRow & { parlamentar_id: string }>

  for (const r of rows) {
    result.set(
      r.parlamentar_id,
      calcularPresenca(Number(r.presentes), Number(r.elegiveis)),
    )
  }
  return result
}

const EMPTY: PresencaStats = calcularPresenca(0, 0)

export async function getPresencaPlenario(
  parlamentarId: string,
): Promise<PresencaStats> {
  return cached(
    `parlamentar:presenca:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      const map = await fetchPresenca([parlamentarId])
      return map.get(parlamentarId) ?? EMPTY
    },
  )
}

// Versão batch para o /comparar (não cacheada aqui — o caller já é cacheado).
export async function getPresencaPlenarioBatch(
  parlamentarIds: string[],
): Promise<Map<string, PresencaStats>> {
  return fetchPresenca(parlamentarIds)
}
