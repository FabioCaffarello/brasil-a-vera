import { sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  calcularPresenca,
  type PresencaStats,
} from '@/modules/votacoes/domain/presenca'
import { db } from '@/shared/db'

// Presença física em sessões deliberativas de plenário (Eixo 1, ADR-046).
//
// DISTINTA da participação em votações (ADR-045, queries/presenca.ts): aqui é
// a frequência à sessão (compareceu), não o voto em roll-calls.
//
// Denominador = sessões deliberativas de plenário da casa na JANELA DE ATIVIDADE
// do parlamentar (1ª/última participação em votos OU sessões — fail-closed);
// presente = consta em presenca_sessao. Reusa calcularPresenca (mesma fórmula
// L2 da ADR-045). Câmara-only. Cache 24h (ADR-018).

interface PresencaRow {
  elegiveis: number | string
  presentes: number | string
}

export async function getPresencaFisica(
  parlamentarId: string,
): Promise<PresencaStats> {
  return cached(
    `parlamentar:presenca-fisica:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      const result = await db.execute(sql`
        WITH alvo AS (
          SELECT p.casa FROM parlamentares.parlamentar p WHERE p.id = ${parlamentarId}
        ),
        win AS (
          SELECT min(dh) AS lo, max(dh) AS hi FROM (
            SELECT v.data_hora AS dh
            FROM votacoes.voto_nominal vn
            JOIN votacoes.votacao v ON v.id = vn.votacao_id
            WHERE vn.parlamentar_id = ${parlamentarId}
            UNION ALL
            SELECT s.data_hora AS dh
            FROM votacoes.presenca_sessao ps
            JOIN votacoes.sessao s ON s.id = ps.sessao_id
            WHERE ps.parlamentar_id = ${parlamentarId}
          ) t
        ),
        eleg AS (
          SELECT s.id
          FROM votacoes.sessao s, win, alvo
          WHERE s.casa = alvo.casa
            AND win.lo IS NOT NULL
            AND s.data_hora BETWEEN win.lo AND win.hi
        )
        SELECT
          (SELECT count(*) FROM eleg)::int AS elegiveis,
          (SELECT count(*) FROM eleg e
             JOIN votacoes.presenca_sessao ps
               ON ps.sessao_id = e.id AND ps.parlamentar_id = ${parlamentarId}
          )::int AS presentes
      `)
      const row = (result.rows as unknown as PresencaRow[])[0]
      return calcularPresenca(
        Number(row?.presentes ?? 0),
        Number(row?.elegiveis ?? 0),
      )
    },
  )
}
