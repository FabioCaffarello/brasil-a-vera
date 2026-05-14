import { Router } from "express";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { parlamentar, votacao, votoNominal, orientacao } from "@workspace/db";

const router = Router();

// GET /api/votacoes
router.get("/", async (req, res) => {
  try {
    const { casa, ano, resultado, somenteNominais } = req.query as Record<string, string>;
    const where = [];
    if (casa === "CAMARA" || casa === "SENADO") where.push(eq(votacao.casa, casa));
    if (ano) {
      const anoNum = Number(ano);
      if (!isNaN(anoNum)) where.push(sql`extract(year from ${votacao.dataHora}) = ${anoNum}`);
    }
    if (resultado === "aprovadas") where.push(eq(votacao.aprovada, true));
    if (resultado === "rejeitadas") where.push(eq(votacao.aprovada, false));
    if (somenteNominais === "1") {
      where.push(sql`exists (select 1 from votacoes.voto_nominal vn where vn.votacao_id = ${votacao.id})`);
    }

    const rows = await db
      .select({
        id: votacao.id,
        sourceId: votacao.sourceId,
        casa: votacao.casa,
        proposicaoId: votacao.proposicaoId,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        orgao: votacao.orgao,
        aprovada: votacao.aprovada,
        votosSim: votacao.votosSim,
        votosNao: votacao.votosNao,
        abstencoes: votacao.abstencoes,
        trustLevel: votacao.trustLevel,
        sourceUrl: votacao.sourceUrl,
      })
      .from(votacao)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(votacao.dataHora))
      .limit(50);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listVotacoes failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/votacoes/filtros
router.get("/filtros", async (req, res) => {
  try {
    const rows = await db
      .select({ ano: sql<number>`extract(year from ${votacao.dataHora})::int` })
      .from(votacao)
      .groupBy(sql`extract(year from ${votacao.dataHora})::int`)
      .orderBy(desc(sql`extract(year from ${votacao.dataHora})::int`));
    res.json({ anos: rows.map((r) => r.ano) });
  } catch (err) {
    req.log.error({ err }, "getVotacoesFiltros failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/votacoes/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(votacao).where(eq(votacao.id, id)).limit(1);
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    const v = rows[0];

    const [votosRows, orientacoesRows] = await Promise.all([
      db
        .select({
          parlamentarId: parlamentar.id,
          nome: parlamentar.nome,
          partidoSigla: parlamentar.partidoSigla,
          uf: parlamentar.uf,
          casa: parlamentar.casa,
          urlFoto: parlamentar.urlFoto,
          voto: votoNominal.voto,
        })
        .from(votoNominal)
        .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
        .where(eq(votoNominal.votacaoId, id))
        .orderBy(asc(parlamentar.partidoSigla), asc(parlamentar.nome)),
      db
        .select({ partidoSigla: orientacao.partidoSigla, orientacao: orientacao.orientacao })
        .from(orientacao)
        .where(eq(orientacao.votacaoId, id)),
    ]);

    res.json({ ...v, votos: votosRows, orientacoes: orientacoesRows });
  } catch (err) {
    req.log.error({ err }, "getVotacao failed");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
