import { describe, expect, it } from 'vitest'
import { ResultadoVotacao } from '../value-objects/resultado-votacao.vo'
import { VotacaoId } from '../value-objects/votacao-id.vo'
import { VotacaoFakeBuilder } from '../votacao-fake.builder'

describe('VotacaoFakeBuilder', () => {
  it('should build with defaults', () => {
    const votacao = VotacaoFakeBuilder.aVotacao().build()
    expect(votacao.descricao).toBe('PL 1234/2024 - Emenda substitutiva')
    expect(votacao.orgao).toBe('Plenário')
    expect(votacao.resultado.votosSim).toBe(300)
    expect(votacao.votos).toHaveLength(3)
    expect(votacao.orientacoes).toHaveLength(4)
  })

  it('should allow overriding', () => {
    const id = new VotacaoId()
    const votacao = VotacaoFakeBuilder.aVotacao()
      .withVotacaoId(id)
      .withDescricao('PEC 45/2019')
      .withOrgao('Comissão Especial')
      .withResultado(new ResultadoVotacao(200, 150, 5, 10, true))
      .build()

    expect(votacao.votacaoId).toBe(id)
    expect(votacao.descricao).toBe('PEC 45/2019')
    expect(votacao.orgao).toBe('Comissão Especial')
    expect(votacao.resultado.votosSim).toBe(200)
  })

  it('should build many', () => {
    const votacoes = VotacaoFakeBuilder.many(5)
    expect(votacoes).toHaveLength(5)
    expect(votacoes[0].descricao).toBe('Votação 1')
    expect(votacoes[4].descricao).toBe('Votação 5')
  })
})
