import { Router } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { parlamentar, proposicaoAutor, proposicaoTema, orientacao, votoNominal, votacao } from "@workspace/db";

const router = Router();

// GET /api/partidos/:sigla
router.get("/:sigla", async (req, res) => {
  try {
    const { sigla } = req.params;
    const ALINHAMENTO_AMOSTRA_MINIMA = 50;

    const rows = await db
      .select({ id: parlamentar.id, nome: parlamentar.nome, casa: parlamentar.casa, uf: parlamentar.uf, urlFoto: parlamentar.urlFoto, partidoNome: parlamentar.partidoNome, partidoSigla: parlamentar.partidoSigla, legislatura: parlamentar.legislatura, trustLevel: parlamentar.trustLevel, sourceUrl: parlamentar.sourceUrl })
      .from(parlamentar)
      .where(eq(parlamentar.partidoSigla, sigla))
      .orderBy(asc(parlamentar.nome));

    if (rows.length === 0) return res.status(404).json({ error: "not found" });

    const nomeMap = new Map<string, number>();
    for (const r of rows) nomeMap.set(r.partidoNome, (nomeMap.get(r.partidoNome) ?? 0) + 1);
    let nomeOficial: string | null = null;
    let max = 0;
    for (const [nome, c] of nomeMap) if (c > max) { max = c; nomeOficial = nome; }

    // Fidelidade interna (simplified)
    const fidelidadeResult = await db.execute(sql`
      WITH alinhamento_por_parlamentar AS (
        SELECT
          vn.parlamentar_id,
          COUNT(*) FILTER (
            WHERE vn.voto NOT IN ('AUSENTE')
              AND ob.orientacao NOT IN ('LIBERADO')
              AND vn.voto = ob.orientacao
          )::int AS alinhados,
          COUNT(*) FILTER (
            WHERE vn.voto NOT IN ('AUSENTE')
              AND ob.orientacao NOT IN ('LIBERADO')
          )::int AS total
        FROM votacoes.voto_nominal vn
        JOIN parlamentares.parlamentar p ON p.id = vn.parlamentar_id
        JOIN votacoes.orientacao_bancada ob
          ON ob.votacao_id = vn.votacao_id
          AND ob.partido_sigla = p.partido_sigla
        WHERE p.partido_sigla = ${sigla}
        GROUP BY vn.parlamentar_id
      )
      SELECT
        COUNT(*) FILTER (WHERE total >= ${ALINHAMENTO_AMOSTRA_MINIMA})::int AS elegiveis,
        COUNT(*)::int AS com_dados,
        AVG(
          CASE
            WHEN total >= ${ALINHAMENTO_AMOSTRA_MINIMA} AND total > 0
            THEN (alinhados::float / total::float) * 100
          END
        ) AS pct_medio
      FROM alinhamento_por_parlamentar
    `);

    const fRow = fidelidadeResult.rows[0] as Record<string, unknown> | undefined;

    res.json({
      sigla,
      nomeOficial,
      totalParlamentares: rows.length,
      parlamentares: rows,
      fidelidadeMedia: fRow?.pct_medio != null ? Math.round(Number(fRow.pct_medio)) : null,
      parlamentaresElegiveis: Number(fRow?.elegiveis ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "getPartido failed");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
