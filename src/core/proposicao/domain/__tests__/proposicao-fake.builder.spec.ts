import { describe, expect, it } from 'vitest'
import { ProposicaoFakeBuilder } from '../proposicao-fake.builder'
import { ProposicaoId } from '../value-objects/proposicao-id.vo'

describe('ProposicaoFakeBuilder', () => {
  it('should build a proposicao with default values', () => {
    const prop = ProposicaoFakeBuilder.aProposicao().build()

    expect(prop.idExterno).toBe('camara-12345')
    expect(prop.casa).toBe('CAMARA')
    expect(prop.tipo).toBe('PL')
    expect(prop.numero).toBe(1234)
    expect(prop.ano).toBe(2025)
    expect(prop.situacao).toBe('TRAMITANDO')
    expect(prop.trust.trustLevel).toBe('L1')
    expect(prop.notification.hasErrors()).toBe(false)
  })

  it('should allow overriding fields with fluent setters', () => {
    const id = new ProposicaoId()
    const prop = ProposicaoFakeBuilder.aProposicao()
      .withProposicaoId(id)
      .withIdExterno('senado-99999')
      .withCasa('SENADO')
      .withTipo('PEC')
      .withNumero(7)
      .withAno(2024)
      .withEmenta('Outra ementa')
      .withSituacao('APROVADA')
      .withAutores(['Senador Beltrano'])
      .withTemas([{ codigoOficial: 100, nome: 'Saúde' }])
      .build()

    expect(prop.proposicaoId).toBe(id)
    expect(prop.idExterno).toBe('senado-99999')
    expect(prop.casa).toBe('SENADO')
    expect(prop.tipo).toBe('PEC')
    expect(prop.numero).toBe(7)
    expect(prop.ano).toBe(2024)
    expect(prop.ementa).toBe('Outra ementa')
    expect(prop.situacao).toBe('APROVADA')
    expect(prop.autores).toEqual(['Senador Beltrano'])
    expect(prop.temas[0].nome).toBe('Saúde')
  })

  it('should build many proposicoes alternating CAMARA/SENADO', () => {
    const props = ProposicaoFakeBuilder.many(6)

    expect(props).toHaveLength(6)
    expect(new Set(props.map((p) => p.idExterno)).size).toBe(6)
    expect(props[0].casa).toBe('CAMARA')
    expect(props[1].casa).toBe('SENADO')
    expect(props[0].idExterno.startsWith('camara-')).toBe(true)
    expect(props[1].idExterno.startsWith('senado-')).toBe(true)
  })
})
