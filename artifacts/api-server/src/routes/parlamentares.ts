import { Router } from "express";
import { and, asc, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  parlamentar,
  proposicao,
  proposicaoAutor,
  votacao,
  votoNominal,
  orientacao,
  gasto,
} from "@workspace/db";

const router = Router();

// GET /api/parlamentares
router.get("/", async (req, res) => {
  try {
    const { casa, partido, uf } = req.query as Record<string, string>;
    const where = [];
    if (casa === "CAMARA" || casa === "SENADO") where.push(eq(parlamentar.casa, casa));
    if (partido) where.push(eq(parlamentar.partidoSigla, partido));
    if (uf) where.push(eq(parlamentar.uf, uf));

    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        partidoNome: parlamentar.partidoNome,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        legislatura: parlamentar.legislatura,
        trustLevel: parlamentar.trustLevel,
        sourceUrl: parlamentar.sourceUrl,
      })
      .from(parlamentar)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(parlamentar.nome);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listParlamentares failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/filtros
router.get("/filtros", async (req, res) => {
  try {
    const [partidos, ufs] = await Promise.all([
      db.selectDistinct({ partidoSigla: parlamentar.partidoSigla }).from(parlamentar).orderBy(parlamentar.partidoSigla),
      db.selectDistinct({ uf: parlamentar.uf }).from(parlamentar).orderBy(parlamentar.uf),
    ]);
    res.json({
      partidos: partidos.map((r) => r.partidoSigla),
      ufs: ufs.map((r) => r.uf),
    });
  } catch (err) {
    req.log.error({ err }, "getParlamentaresFiltros failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(parlamentar).where(eq(parlamentar.id, id)).limit(1);
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "getParlamentar failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id/votos-recentes
router.get("/:id/votos-recentes", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({
        voto: votoNominal.voto,
        votacaoId: votacao.id,
        votacaoSourceId: votacao.sourceId,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        orgao: votacao.orgao,
        casa: votacao.casa,
        aprovada: votacao.aprovada,
      })
      .from(votoNominal)
      .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
      .where(eq(votoNominal.parlamentarId, id))
      .orderBy(desc(votacao.dataHora))
      .limit(10);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "getVotosRecentes failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id/proposicoes-autoradas
router.get("/:id/proposicoes-autoradas", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({
        id: proposicao.id,
        tipo: proposicao.tipo,
        numero: proposicao.numero,
        ano: proposicao.ano,
        ementa: proposicao.ementa,
        situacao: proposicao.situacao,
      })
      .from(proposicaoAutor)
      .innerJoin(proposicao, eq(proposicao.id, proposicaoAutor.proposicaoId))
      .where(eq(proposicaoAutor.parlamentarId, id))
      .orderBy(desc(proposicao.ano), desc(proposicao.numero))
      .limit(5);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "getProposicoesAutoradas failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id/gastos-resumo
router.get("/:id/gastos-resumo", async (req, res) => {
  try {
    const { id } = req.params;
    const ano = new Date().getFullYear();
    const rows = await db
      .select({
        categoriaDescricao: gasto.categoriaDescricao,
        n: count(gasto.id),
        total: sum(gasto.valor),
      })
      .from(gasto)
      .where(and(eq(gasto.parlamentarId, id), sql`extract(year from ${gasto.dataEmissao}) = ${ano}`))
      .groupBy(gasto.categoriaDescricao)
      .orderBy(desc(sum(gasto.valor)));

    let totalGeralCents = 0;
    let totalRegistros = 0;
    const topCategorias = rows.map((r) => {
      const t = Number(r.total ?? "0");
      totalGeralCents += Math.round(t * 100);
      totalRegistros += r.n;
      return { categoriaDescricao: r.categoriaDescricao, total: r.total ?? "0", n: r.n };
    });

    res.json({
      totalGeral: (totalGeralCents / 100).toFixed(2),
      totalRegistros,
      topCategorias: topCategorias.slice(0, 5),
      ano,
    });
  } catch (err) {
    req.log.error({ err }, "getGastosResumo failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id/alinhamento
router.get("/:id/alinhamento", async (req, res) => {
  try {
    const { id } = req.params;
    const ALINHAMENTO_AMOSTRA_MINIMA = 50;
    const TOP_LIMIT = 5;

    const parlRows = await db
      .select({ partidoSigla: parlamentar.partidoSigla })
      .from(parlamentar)
      .where(eq(parlamentar.id, id))
      .limit(1);
    const partidoSigla = parlRows[0]?.partidoSigla;

    if (!partidoSigla) {
      return res.json({
        partidoSigla: null, percentual: null, total: 0, alinhados: 0,
        divergentes: 0, amostraInsuficiente: true, topDivergencias: [], topConvergencias: [],
      });
    }

    const rows = await db
      .select({
        votacaoId: votacao.id,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        voto: votoNominal.voto,
        orientacaoVoto: orientacao.orientacao,
      })
      .from(votoNominal)
      .innerJoin(orientacao, and(eq(orientacao.votacaoId, votoNominal.votacaoId), eq(orientacao.partidoSigla, partidoSigla)))
      .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
      .where(eq(votoNominal.parlamentarId, id))
      .orderBy(desc(votacao.dataHora));

    let total = 0, alinhados = 0, divergentes = 0;
    const topDivergencias: typeof rows = [];
    const topConvergencias: typeof rows = [];

    for (const r of rows) {
      if (r.voto === "AUSENTE" || r.orientacaoVoto === "LIBERADO") continue;
      total++;
      const alinhado = r.voto === r.orientacaoVoto;
      if (alinhado) {
        alinhados++;
        if (topConvergencias.length < TOP_LIMIT) topConvergencias.push(r);
      } else {
        divergentes++;
        if (topDivergencias.length < TOP_LIMIT) topDivergencias.push(r);
      }
    }

    res.json({
      partidoSigla,
      percentual: total > 0 ? Math.round((alinhados / total) * 100) : null,
      total,
      alinhados,
      divergentes,
      amostraInsuficiente: total < ALINHAMENTO_AMOSTRA_MINIMA,
      topDivergencias: topDivergencias.map((r) => ({
        votacaoId: r.votacaoId,
        dataHora: r.dataHora,
        descricao: r.descricao,
        voto: r.voto,
        orientacao: r.orientacaoVoto,
      })),
      topConvergencias: topConvergencias.map((r) => ({
        votacaoId: r.votacaoId,
        dataHora: r.dataHora,
        descricao: r.descricao,
        voto: r.voto,
        orientacao: r.orientacaoVoto,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getAlinhamento failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/parlamentares/:id/afinidade-voto
router.get("/:id/afinidade-voto", async (req, res) => {
  try {
    const { id } = req.params;
    const AMOSTRA_MINIMA = 20;
    const JANELA_MESES = 12;

    const result = await db.execute(sql`
      WITH votos_em_comum AS (
        SELECT
          vn2.parlamentar_id,
          COUNT(*)::int AS total_em_comum,
          COUNT(*) FILTER (WHERE vn1.voto = vn2.voto)::int AS coincidentes
        FROM votacoes.voto_nominal vn1
        JOIN votacoes.voto_nominal vn2
          ON vn2.votacao_id = vn1.votacao_id
          AND vn2.parlamentar_id <> vn1.parlamentar_id
        INNER JOIN votacoes.votacao v ON v.id = vn1.votacao_id
        WHERE vn1.parlamentar_id = ${id}
          AND vn1.voto <> 'AUSENTE'
          AND vn2.voto <> 'AUSENTE'
          AND v.data_hora >= now() - make_interval(months => ${JANELA_MESES})
        GROUP BY vn2.parlamentar_id
        HAVING COUNT(*) >= ${AMOSTRA_MINIMA}
      )
      SELECT
        p.id AS parlamentar_id,
        p.nome,
        p.partido_sigla,
        p.uf,
        p.casa,
        p.url_foto,
        vec.coincidentes,
        vec.total_em_comum
      FROM votos_em_comum vec
      JOIN parlamentares.parlamentar p ON p.id = vec.parlamentar_id
      ORDER BY
        (vec.coincidentes::float / vec.total_em_comum) DESC,
        vec.total_em_comum DESC
      LIMIT 5
    `);

    res.json(result.rows.map((r: Record<string, unknown>) => {
      const c = Number(r.coincidentes);
      const t = Number(r.total_em_comum);
      return {
        parlamentarId: String(r.parlamentar_id),
        nome: String(r.nome),
        partidoSigla: String(r.partido_sigla),
        uf: String(r.uf),
        casa: String(r.casa),
        urlFoto: r.url_foto ? String(r.url_foto) : null,
        votosCoincidentes: c,
        totalVotosEmComum: t,
        percentualAfinidade: Math.round((c / t) * 100),
      };
    }));
  } catch (err) {
    req.log.error({ err }, "getAfinidadeVoto failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/comparar?ids=id1,id2,id3
router.get("/comparar/resultado", async (req, res) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.status(400).json({ error: "ids required" });
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length < 2 || ids.length > 3) {
      return res.status(400).json({ error: "2-3 ids required" });
    }

    const parlamentares = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        legislatura: parlamentar.legislatura,
        trustLevel: parlamentar.trustLevel,
        sourceUrl: parlamentar.sourceUrl,
        partidoNome: parlamentar.partidoNome,
      })
      .from(parlamentar)
      .where(inArray(parlamentar.id, ids));

    if (parlamentares.length !== ids.length) {
      return res.status(400).json({ error: "one or more ids not found" });
    }

    const ano = new Date().getFullYear();

    const votos = await db
      .select({
        parlamentarId: votoNominal.parlamentarId,
        votacaoId: votoNominal.votacaoId,
        voto: votoNominal.voto,
      })
      .from(votoNominal)
      .where(inArray(votoNominal.parlamentarId, ids));

    // Presença
    const presencaMap = new Map<string, { presente: number; total: number }>();
    for (const id of ids) presencaMap.set(id, { presente: 0, total: 0 });
    for (const v of votos) {
      const cur = presencaMap.get(v.parlamentarId);
      if (!cur) continue;
      cur.total++;
      if (v.voto !== "AUSENTE") cur.presente++;
    }

    // Concordância par a par
    const votosPorId = new Map<string, Map<string, string>>();
    for (const id of ids) votosPorId.set(id, new Map());
    for (const v of votos) {
      votosPorId.get(v.parlamentarId)?.set(v.votacaoId, v.voto);
    }

    const concordancia = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        const votosA = votosPorId.get(a)!;
        const votosB = votosPorId.get(b)!;
        let emComum = 0, coincidentes = 0;
        for (const [vid, vA] of votosA) {
          const vB = votosB.get(vid);
          if (!vB || vA === "AUSENTE" || vB === "AUSENTE") continue;
          emComum++;
          if (vA === vB) coincidentes++;
        }
        concordancia.push({
          a,
          b,
          votosEmComum: emComum,
          coincidentes,
          percentual: emComum > 0 ? Math.round((coincidentes / emComum) * 100) : null,
        });
      }
    }

    // Proposições autoria primária
    const propsRows = await db
      .select({
        parlamentarId: proposicaoAutor.parlamentarId,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(proposicaoAutor)
      .where(and(inArray(proposicaoAutor.parlamentarId, ids), eq(proposicaoAutor.tipoAutoria, "AUTOR")))
      .groupBy(proposicaoAutor.parlamentarId);

    const propsPorId = new Map<string, number>();
    for (const r of propsRows) if (r.parlamentarId) propsPorId.set(r.parlamentarId, Number(r.total));

    // Gastos
    const gastosRows = await db
      .select({
        parlamentarId: gasto.parlamentarId,
        categoriaDescricao: gasto.categoriaDescricao,
        total: sql<string | null>`SUM(${gasto.valor})`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(gasto)
      .where(and(inArray(gasto.parlamentarId, ids), sql`extract(year from ${gasto.dataEmissao}) = ${ano}`))
      .groupBy(gasto.parlamentarId, gasto.categoriaDescricao)
      .orderBy(desc(sql`SUM(${gasto.valor})`));

    const gastosPorId = new Map<string, Array<{ categoriaDescricao: string; total: string; n: number }>>();
    for (const id of ids) gastosPorId.set(id, []);
    for (const r of gastosRows) {
      gastosPorId.get(r.parlamentarId)?.push({ categoriaDescricao: r.categoriaDescricao, total: r.total ?? "0", n: Number(r.n) });
    }

    const metricas = ids.map((id) => {
      const p = presencaMap.get(id) ?? { presente: 0, total: 0 };
      const cats = gastosPorId.get(id) ?? [];
      let totalGeralCents = 0, totalRegistros = 0;
      for (const c of cats) { totalGeralCents += Math.round(Number(c.total) * 100); totalRegistros += c.n; }
      return {
        parlamentarId: id,
        presenca: { presente: p.presente, total: p.total, percentual: p.total > 0 ? Math.round((p.presente / p.total) * 100) : null },
        gastosTotalGeral: (totalGeralCents / 100).toFixed(2),
        gastosTotalRegistros: totalRegistros,
        gastosTopCategorias: cats.slice(0, 3),
        proposicoesAutoriaPrimaria: propsPorId.get(id) ?? 0,
      };
    });

    res.json({ parlamentares, metricas, concordancia, ano });
  } catch (err) {
    req.log.error({ err }, "comparar failed");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
