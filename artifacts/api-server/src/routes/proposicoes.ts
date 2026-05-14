import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { proposicao, proposicaoAutor, proposicaoTema, tramitacao, votacao } from "@workspace/db";

const router = Router();

// GET /api/proposicoes
router.get("/", async (req, res) => {
  try {
    const { tipo, ano, situacao } = req.query as Record<string, string>;
    const TIPOS_VALIDOS = ["PL", "PEC", "PLP", "MPV", "PDC", "PRC"];
    const SITUACOES_VALIDAS = ["TRAMITANDO", "APROVADA", "REJEITADA", "ARQUIVADA", "TRANSFORMADA_EM_NORMA"];

    const where = [];
    if (tipo && TIPOS_VALIDOS.includes(tipo)) where.push(eq(proposicao.tipo, tipo as "PL" | "PEC" | "PLP" | "MPV" | "PDC" | "PRC"));
    if (ano) {
      const anoNum = Number(ano);
      if (!isNaN(anoNum)) where.push(eq(proposicao.ano, anoNum));
    }
    if (situacao && SITUACOES_VALIDAS.includes(situacao)) where.push(eq(proposicao.situacao, situacao as "TRAMITANDO" | "APROVADA" | "REJEITADA" | "ARQUIVADA" | "TRANSFORMADA_EM_NORMA"));

    const rows = await db
      .select({
        id: proposicao.id,
        tipo: proposicao.tipo,
        numero: proposicao.numero,
        ano: proposicao.ano,
        ementa: proposicao.ementa,
        ementaDetalhada: proposicao.ementaDetalhada,
        situacao: proposicao.situacao,
        regime: proposicao.regime,
        trustLevel: proposicao.trustLevel,
        sourceUrl: proposicao.sourceUrl,
      })
      .from(proposicao)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(proposicao.ano), desc(proposicao.numero))
      .limit(50);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listProposicoes failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/proposicoes/filtros
router.get("/filtros", async (req, res) => {
  try {
    const rows = await db
      .selectDistinct({ ano: proposicao.ano })
      .from(proposicao)
      .orderBy(desc(proposicao.ano));
    res.json({ anos: rows.map((r) => r.ano) });
  } catch (err) {
    req.log.error({ err }, "getProposicoesFiltros failed");
    res.status(500).json({ error: "internal" });
  }
});

// GET /api/proposicoes/:tipo/:numero/:ano
router.get("/:tipo/:numero/:ano", async (req, res) => {
  try {
    const { tipo, numero, ano } = req.params;
    const TIPOS_VALIDOS = ["PL", "PEC", "PLP", "MPV", "PDC", "PRC"];
    if (!TIPOS_VALIDOS.includes(tipo)) return res.status(404).json({ error: "not found" });

    const numeroInt = parseInt(numero, 10);
    const anoInt = parseInt(ano, 10);
    if (isNaN(numeroInt) || isNaN(anoInt)) return res.status(404).json({ error: "not found" });

    const rows = await db
      .select()
      .from(proposicao)
      .where(and(eq(proposicao.tipo, tipo as "PL"), eq(proposicao.numero, numeroInt), eq(proposicao.ano, anoInt)))
      .limit(1);

    if (!rows[0]) return res.status(404).json({ error: "not found" });
    const p = rows[0];

    const [autores, temas, tramitacoes, votacoes] = await Promise.all([
      db.select({ parlamentarId: proposicaoAutor.parlamentarId, nome: proposicaoAutor.nome, tipoAutoria: proposicaoAutor.tipoAutoria })
        .from(proposicaoAutor).where(eq(proposicaoAutor.proposicaoId, p.id)),
      db.select({ codigoTema: proposicaoTema.codigoTema, nomeTema: proposicaoTema.nomeTema })
        .from(proposicaoTema).where(eq(proposicaoTema.proposicaoId, p.id)),
      db.select({ id: tramitacao.id, data: tramitacao.data, orgao: tramitacao.orgao, descricaoResumida: tramitacao.descricaoResumida, descricaoCompleta: tramitacao.descricaoCompleta, situacaoResultante: tramitacao.situacaoResultante })
        .from(tramitacao).where(eq(tramitacao.proposicaoId, p.id)).orderBy(desc(tramitacao.data)),
      db.select({ id: votacao.id, sourceId: votacao.sourceId, casa: votacao.casa, proposicaoId: votacao.proposicaoId, dataHora: votacao.dataHora, descricao: votacao.descricao, orgao: votacao.orgao, aprovada: votacao.aprovada, votosSim: votacao.votosSim, votosNao: votacao.votosNao, abstencoes: votacao.abstencoes, trustLevel: votacao.trustLevel, sourceUrl: votacao.sourceUrl })
        .from(votacao).where(eq(votacao.proposicaoId, p.id)).orderBy(desc(votacao.dataHora)),
    ]);

    res.json({ ...p, autores, temas, tramitacao: tramitacoes, votacoes });
  } catch (err) {
    req.log.error({ err }, "getProposicao failed");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
