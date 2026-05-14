import { Router } from "express";
import { desc, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { parlamentar, proposicao, votacao } from "@workspace/db";

const router = Router();

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

function parseProposicaoRef(query: string): { tipo: string; numero: number; ano: number } | null {
  const m = query.trim().toUpperCase().match(/^(PL|PEC|PLP|MPV|PDC|PRC)\s+(\d+)[/\\](\d{4})$/);
  if (!m) return null;
  return { tipo: m[1], numero: parseInt(m[2], 10), ano: parseInt(m[3], 10) };
}

// GET /api/busca?q=...
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q as string ?? "").trim();
    if (q.length < 2) {
      return res.json({ parlamentares: [], proposicoes: [], votacoes: [], proposicaoMatchExato: null });
    }

    const pattern = `%${escapeIlike(q)}%`;
    const proposicaoRef = parseProposicaoRef(q);

    const [parlamentares, proposicoes, votacoes_] = await Promise.all([
      db
        .select({ id: parlamentar.id, nome: parlamentar.nome, casa: parlamentar.casa, partidoSigla: parlamentar.partidoSigla, uf: parlamentar.uf, urlFoto: parlamentar.urlFoto, legislatura: parlamentar.legislatura, trustLevel: parlamentar.trustLevel, sourceUrl: parlamentar.sourceUrl, partidoNome: parlamentar.partidoNome })
        .from(parlamentar)
        .where(sql`${parlamentar.nome} ILIKE ${pattern}`)
        .orderBy(parlamentar.nome)
        .limit(10),
      db
        .select({ id: proposicao.id, tipo: proposicao.tipo, numero: proposicao.numero, ano: proposicao.ano, ementa: proposicao.ementa, situacao: proposicao.situacao })
        .from(proposicao)
        .where(or(sql`${proposicao.ementa} ILIKE ${pattern}`, sql`${proposicao.ementaDetalhada} ILIKE ${pattern}`))
        .orderBy(desc(proposicao.ano))
        .limit(10),
      db
        .select({ id: votacao.id, sourceId: votacao.sourceId, casa: votacao.casa, proposicaoId: votacao.proposicaoId, dataHora: votacao.dataHora, descricao: votacao.descricao, orgao: votacao.orgao, aprovada: votacao.aprovada, votosSim: votacao.votosSim, votosNao: votacao.votosNao, abstencoes: votacao.abstencoes, trustLevel: votacao.trustLevel, sourceUrl: votacao.sourceUrl })
        .from(votacao)
        .where(sql`${votacao.descricao} ILIKE ${pattern}`)
        .orderBy(desc(votacao.dataHora))
        .limit(10),
    ]);

    res.json({
      parlamentares,
      proposicoes,
      votacoes: votacoes_,
      proposicaoMatchExato: proposicaoRef,
    });
  } catch (err) {
    req.log.error({ err }, "busca failed");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
