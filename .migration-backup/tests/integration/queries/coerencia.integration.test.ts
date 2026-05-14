import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getCoerenciaStats,
  getParesContraditorios,
} from '@/lib/queries/coerencia'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao, proposicaoTema } from '@/modules/proposicoes/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildProposicao, buildProposicaoTema } from '../fixtures/proposicoes'
import { buildVotacao, buildVotoNominal } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

// classifyDirecao usa heurísticas de palavras-chave:
// - "proibe" / "veda" / "revoga" → RESTRITIVA
// - "autoriza" / "permite" / "amplia" → PERMISSIVA
// eContraditorio: direções opostas + voto idêntico.

describe('queries/coerencia (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('getParesContraditorios', () => {
    it('retorna array vazio quando parlamentar não tem votos', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)

      const result = await getParesContraditorios(p.id as string)
      expect(result).toEqual([])
    })

    it('detecta par contraditório: SIM em proposição RESTRITIVA + SIM em PERMISSIVA com tema comum', async () => {
      const p = buildParlamentar()
      const propRestritiva = buildProposicao({
        numero: 100,
        ano: 2026,
        tipo: 'PL',
        ementa: 'Proibe atividade X em determinada situação',
      })
      const propPermissiva = buildProposicao({
        numero: 200,
        ano: 2026,
        tipo: 'PL',
        ementa: 'Autoriza atividade Y em determinada situação',
      })
      const vRestritiva = buildVotacao({
        proposicaoId: propRestritiva.id as string,
        descricao: 'Votação restritiva',
        dataHora: new Date('2026-03-01T10:00:00Z'),
      })
      const vPermissiva = buildVotacao({
        proposicaoId: propPermissiva.id as string,
        descricao: 'Votação permissiva',
        dataHora: new Date('2026-04-01T10:00:00Z'),
      })

      await db.insert(parlamentar).values(p)
      await db.insert(proposicao).values([propRestritiva, propPermissiva])
      await db.insert(proposicaoTema).values([
        buildProposicaoTema({
          proposicaoId: propRestritiva.id as string,
          codigoTema: 1,
          nomeTema: 'Saúde Pública',
        }),
        buildProposicaoTema({
          proposicaoId: propPermissiva.id as string,
          codigoTema: 1,
          nomeTema: 'Saúde Pública',
        }),
      ])
      await db.insert(votacao).values([vRestritiva, vPermissiva])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: vRestritiva.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: vPermissiva.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
      ])

      const result = await getParesContraditorios(p.id as string)
      expect(result).toHaveLength(1)
      expect(result[0]?.tema).toBe('Saúde Pública')
      expect(result[0]?.diasEntreVotos).toBe(31)
      expect(result[0]?.voto1.voto).toBe('SIM')
      expect(result[0]?.voto2.voto).toBe('SIM')
      // Direções devem ser opostas
      const direcoes = [result[0]?.voto1.direcao, result[0]?.voto2.direcao]
      expect(direcoes).toContain('RESTRITIVA')
      expect(direcoes).toContain('PERMISSIVA')
    })

    it('não retorna par quando temas não coincidem', async () => {
      const p = buildParlamentar()
      const propA = buildProposicao({
        numero: 100,
        ano: 2026,
        ementa: 'Proibe X',
      })
      const propB = buildProposicao({
        numero: 200,
        ano: 2026,
        ementa: 'Autoriza Y',
      })
      const vA = buildVotacao({
        proposicaoId: propA.id as string,
        dataHora: new Date('2026-03-01T10:00:00Z'),
      })
      const vB = buildVotacao({
        proposicaoId: propB.id as string,
        dataHora: new Date('2026-04-01T10:00:00Z'),
      })

      await db.insert(parlamentar).values(p)
      await db.insert(proposicao).values([propA, propB])
      await db.insert(proposicaoTema).values([
        buildProposicaoTema({
          proposicaoId: propA.id as string,
          codigoTema: 1,
          nomeTema: 'Saúde',
        }),
        buildProposicaoTema({
          proposicaoId: propB.id as string,
          codigoTema: 2,
          nomeTema: 'Educação',
        }),
      ])
      await db.insert(votacao).values([vA, vB])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: vA.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: vB.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
      ])

      const result = await getParesContraditorios(p.id as string)
      expect(result).toEqual([])
    })
  })

  describe('getCoerenciaStats', () => {
    it('retorna stats zeradas quando parlamentar não tem votos', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)

      const result = await getCoerenciaStats(p.id as string)
      expect(result).toEqual({
        votosClassificados: 0,
        votosTotaisComProposicao: 0,
        paresContraditoriosDetectados: 0,
      })
    })

    it('conta votos classificados, totais com proposição e pares', async () => {
      const p = buildParlamentar()
      const propClass1 = buildProposicao({
        numero: 100,
        ano: 2026,
        ementa: 'Proibe X',
      })
      const propClass2 = buildProposicao({
        numero: 200,
        ano: 2026,
        ementa: 'Autoriza Y',
      })
      const propNaoClass = buildProposicao({
        numero: 300,
        ano: 2026,
        ementa: 'Ementa sem palavra-chave de direção',
      })
      const vClass1 = buildVotacao({
        proposicaoId: propClass1.id as string,
        dataHora: new Date('2026-03-01T10:00:00Z'),
      })
      const vClass2 = buildVotacao({
        proposicaoId: propClass2.id as string,
        dataHora: new Date('2026-04-01T10:00:00Z'),
      })
      const vNaoClass = buildVotacao({
        proposicaoId: propNaoClass.id as string,
        dataHora: new Date('2026-05-01T10:00:00Z'),
      })

      await db.insert(parlamentar).values(p)
      await db.insert(proposicao).values([propClass1, propClass2, propNaoClass])
      await db.insert(proposicaoTema).values([
        buildProposicaoTema({
          proposicaoId: propClass1.id as string,
          codigoTema: 1,
          nomeTema: 'T',
        }),
        buildProposicaoTema({
          proposicaoId: propClass2.id as string,
          codigoTema: 1,
          nomeTema: 'T',
        }),
      ])
      await db.insert(votacao).values([vClass1, vClass2, vNaoClass])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: vClass1.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: vClass2.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: vNaoClass.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
      ])

      const result = await getCoerenciaStats(p.id as string)
      expect(result.votosTotaisComProposicao).toBe(3)
      expect(result.votosClassificados).toBe(2)
      expect(result.paresContraditoriosDetectados).toBe(1)
    })
  })
})
