import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getFidelidadeInternaMedia,
  getGastoBancadaAno,
  getPartidoOverview,
  getTop5TemasPartido,
} from '@/lib/queries/partidos'
import { gasto } from '@/modules/gastos/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
} from '@/modules/proposicoes/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { buildGasto } from '../fixtures/gastos'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildProposicao,
  buildProposicaoAutor,
  buildProposicaoTema,
} from '../fixtures/proposicoes'
import {
  buildOrientacao,
  buildVotacao,
  buildVotoNominal,
} from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/partidos (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('getPartidoOverview', () => {
    it('retorna partido vazio quando não há membros', async () => {
      const r = await getPartidoOverview('XYZ')
      expect(r.sigla).toBe('XYZ')
      expect(r.totalParlamentares).toBe(0)
      expect(r.parlamentares).toEqual([])
      expect(r.nomeOficial).toBeNull()
    })

    it('agrega membros ordenados por nome e infere nomeOficial mais comum', async () => {
      await db.insert(parlamentar).values([
        buildParlamentar({
          nome: 'Ana',
          partidoSigla: 'PT',
          partidoNome: 'Partido dos Trabalhadores',
        }),
        buildParlamentar({
          nome: 'Bruno',
          partidoSigla: 'PT',
          partidoNome: 'Partido dos Trabalhadores',
        }),
        // 1 parlamentar com nomeOficial divergente (raro mas acontece)
        buildParlamentar({
          nome: 'Carlos',
          partidoSigla: 'PT',
          partidoNome: 'PT - typo',
        }),
        buildParlamentar({ nome: 'Outro', partidoSigla: 'PL' }),
      ])

      const r = await getPartidoOverview('PT')
      expect(r.totalParlamentares).toBe(3)
      expect(r.parlamentares.map((p) => p.nome)).toEqual([
        'Ana',
        'Bruno',
        'Carlos',
      ])
      expect(r.nomeOficial).toBe('Partido dos Trabalhadores')
    })
  })

  describe('getFidelidadeInternaMedia', () => {
    it('retorna zeros quando partido não tem membros', async () => {
      const r = await getFidelidadeInternaMedia('XYZ')
      expect(r.percentualMedio).toBeNull()
      expect(r.parlamentaresElegiveis).toBe(0)
      expect(r.parlamentaresTotal).toBe(0)
    })

    // Siglas de cálculo usam PL (não-federada). PT/PCdoB/PV etc. caem no
    // short-circuit de federação (ADR-041) — testado à parte abaixo.
    it('ignora parlamentares com < 50 votos comparáveis', async () => {
      const p = buildParlamentar({ partidoSigla: 'PL' })
      const v = buildVotacao()
      await db.insert(parlamentar).values(p)
      await db.insert(votacao).values(v)
      await db.insert(orientacao).values(
        buildOrientacao({
          votacaoId: v.id as string,
          partidoSigla: 'PL',
          orientacao: 'SIM',
        }),
      )
      await db.insert(votoNominal).values(
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
      )

      const r = await getFidelidadeInternaMedia('PL')
      expect(r.parlamentaresElegiveis).toBe(0)
      expect(r.parlamentaresTotal).toBe(1) // tem dados mas só 1 voto
      expect(r.percentualMedio).toBeNull()
      expect(r.emFederacao).toBe(false)
    })

    it('calcula média simples dos parlamentares elegíveis', async () => {
      // 2 parlamentares PL, ambos com ≥ 50 votos comparáveis.
      // P1: 50 alinhados de 50 → 100%
      // P2: 25 alinhados de 50 → 50%
      // Média simples: 75%
      const p1 = buildParlamentar({ nome: 'P1', partidoSigla: 'PL' })
      const p2 = buildParlamentar({ nome: 'P2', partidoSigla: 'PL' })
      await db.insert(parlamentar).values([p1, p2])

      const votacoes = Array.from({ length: 50 }, () => buildVotacao())
      await db.insert(votacao).values(votacoes)
      await db.insert(orientacao).values(
        votacoes.map((v) =>
          buildOrientacao({
            votacaoId: v.id as string,
            partidoSigla: 'PL',
            orientacao: 'SIM',
          }),
        ),
      )

      const votosP1 = votacoes.map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p1.id as string,
          voto: 'SIM',
        }),
      )
      // P2: 25 SIM (alinhados) + 25 NAO (divergentes)
      const votosP2 = votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p2.id as string,
          voto: i < 25 ? 'SIM' : 'NAO',
        }),
      )
      await db.insert(votoNominal).values([...votosP1, ...votosP2])

      const r = await getFidelidadeInternaMedia('PL')
      expect(r.parlamentaresElegiveis).toBe(2)
      expect(r.parlamentaresTotal).toBe(2)
      expect(r.percentualMedio).toBe(75)
      expect(r.emFederacao).toBe(false)
      expect(r.federacaoNome).toBeNull()
    })

    // Federação (ADR-041, #483): partido federado é short-circuitado ANTES do
    // join — nenhum número é produzido, mesmo com dados suficientes no banco
    // (caso de borda ≥50 votos: o percentual espúrio é eliminado por desenho,
    // não por limiar). Sinaliza emFederacao + federacaoNome.
    it('suprime cálculo e sinaliza federação para partido federado (PT)', async () => {
      // Insere dados que DARIAM ≥50 votos comparáveis casáveis pela sigla — a
      // supressão tem que ganhar mesmo assim.
      const p = buildParlamentar({ nome: 'Petista', partidoSigla: 'PT' })
      await db.insert(parlamentar).values(p)
      const votacoes = Array.from({ length: 50 }, () => buildVotacao())
      await db.insert(votacao).values(votacoes)
      await db.insert(orientacao).values(
        votacoes.map((v) =>
          buildOrientacao({
            votacaoId: v.id as string,
            partidoSigla: 'PT',
            orientacao: 'SIM',
          }),
        ),
      )
      await db.insert(votoNominal).values(
        votacoes.map((v) =>
          buildVotoNominal({
            votacaoId: v.id as string,
            parlamentarId: p.id as string,
            voto: 'SIM',
          }),
        ),
      )

      const r = await getFidelidadeInternaMedia('PT')
      expect(r.emFederacao).toBe(true)
      expect(r.federacaoNome).toBe('Federação Brasil da Esperança (FE BRASIL)')
      expect(r.percentualMedio).toBeNull()
      expect(r.parlamentaresElegiveis).toBe(0)
      expect(r.parlamentaresTotal).toBe(0)
    })
  })

  describe('getTop5TemasPartido', () => {
    it('retorna vazio quando partido não tem proposições autoradas', async () => {
      const r = await getTop5TemasPartido('XYZ')
      expect(r).toEqual([])
    })

    it('agrega temas por contagem desc com limite 5', async () => {
      const p = buildParlamentar({ partidoSigla: 'PT' })
      const props = Array.from({ length: 6 }, (_, i) =>
        buildProposicao({ numero: i + 1, ano: 2026 }),
      )
      await db.insert(parlamentar).values(p)
      await db.insert(proposicao).values(props)
      await db.insert(proposicaoAutor).values(
        props.map((prop) =>
          buildProposicaoAutor({
            proposicaoId: prop.id as string,
            parlamentarId: p.id as string,
            nome: 'autor',
          }),
        ),
      )
      // Tema "Saúde" em 3 props, "Educação" em 2, "Cultura" em 1
      await db.insert(proposicaoTema).values([
        buildProposicaoTema({
          proposicaoId: props[0].id as string,
          codigoTema: 1,
          nomeTema: 'Saúde',
        }),
        buildProposicaoTema({
          proposicaoId: props[1].id as string,
          codigoTema: 1,
          nomeTema: 'Saúde',
        }),
        buildProposicaoTema({
          proposicaoId: props[2].id as string,
          codigoTema: 1,
          nomeTema: 'Saúde',
        }),
        buildProposicaoTema({
          proposicaoId: props[3].id as string,
          codigoTema: 2,
          nomeTema: 'Educação',
        }),
        buildProposicaoTema({
          proposicaoId: props[4].id as string,
          codigoTema: 2,
          nomeTema: 'Educação',
        }),
        buildProposicaoTema({
          proposicaoId: props[5].id as string,
          codigoTema: 3,
          nomeTema: 'Cultura',
        }),
      ])

      const r = await getTop5TemasPartido('PT')
      expect(r).toEqual([
        { nomeTema: 'Saúde', contagem: 3 },
        { nomeTema: 'Educação', contagem: 2 },
        { nomeTema: 'Cultura', contagem: 1 },
      ])
    })
  })

  describe('getGastoBancadaAno', () => {
    it('retorna zeros quando partido não tem gastos', async () => {
      const r = await getGastoBancadaAno('XYZ', 2026)
      expect(r.totalGeral).toBe('0.00')
      expect(r.totalRegistros).toBe(0)
    })

    it('agrega gastos da bancada no ano filtrado', async () => {
      const p1 = buildParlamentar({ nome: 'P1', partidoSigla: 'PT' })
      const p2 = buildParlamentar({ nome: 'P2', partidoSigla: 'PT' })
      const pOutro = buildParlamentar({ nome: 'PL1', partidoSigla: 'PL' })
      await db.insert(parlamentar).values([p1, p2, pOutro])
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p1.id as string,
          valor: '100.50',
          dataEmissao: '2026-03-01',
        }),
        buildGasto({
          parlamentarId: p2.id as string,
          valor: '200.00',
          dataEmissao: '2026-04-01',
        }),
        // Outro ano — ignorado
        buildGasto({
          parlamentarId: p1.id as string,
          valor: '999.99',
          dataEmissao: '2024-05-01',
        }),
        // Outro partido — ignorado
        buildGasto({
          parlamentarId: pOutro.id as string,
          valor: '500.00',
          dataEmissao: '2026-03-01',
        }),
      ])

      const r = await getGastoBancadaAno('PT', 2026)
      expect(r.totalGeral).toBe('300.50')
      expect(r.totalRegistros).toBe(2)
    })
  })
})
