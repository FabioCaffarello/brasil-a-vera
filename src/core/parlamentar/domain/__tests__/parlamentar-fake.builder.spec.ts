import { describe, expect, it } from 'vitest'
import { ParlamentarFakeBuilder } from '../parlamentar-fake.builder'
import { ParlamentarId } from '../value-objects/parlamentar-id.vo'

describe('ParlamentarFakeBuilder', () => {
  it('should build a parlamentar with default values', () => {
    const parlamentar = ParlamentarFakeBuilder.aParlamentar().build()

    expect(parlamentar.nome).toBe('João da Silva')
    expect(parlamentar.uf).toBe('SP')
    expect(parlamentar.partidoAtual.sigla).toBe('PT')
    expect(parlamentar.casa).toBe('CAMARA')
    expect(parlamentar.trust.trustLevel).toBe('L1')
  })

  it('should allow overriding fields', () => {
    const id = new ParlamentarId()
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withParlamentarId(id)
      .withNome('Maria Santos')
      .withUf('RJ')
      .withPartido('PSOL', 'Partido Socialismo e Liberdade')
      .withCasa('SENADO')
      .build()

    expect(parlamentar.parlamentarId).toBe(id)
    expect(parlamentar.nome).toBe('Maria Santos')
    expect(parlamentar.uf).toBe('RJ')
    expect(parlamentar.partidoAtual.sigla).toBe('PSOL')
    expect(parlamentar.casa).toBe('SENADO')
  })

  it('should build many parlamentares', () => {
    const parlamentares = ParlamentarFakeBuilder.many(5)

    expect(parlamentares).toHaveLength(5)
    expect(parlamentares[0].nome).toBe('Parlamentar 1')
    expect(parlamentares[4].nome).toBe('Parlamentar 5')
    // Different UFs cycling through SP, RJ, MG, BA, RS
    expect(parlamentares[0].uf).toBe('SP')
    expect(parlamentares[1].uf).toBe('RJ')
    expect(parlamentares[2].uf).toBe('MG')
  })

  it('should allow setting optional fields', () => {
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withNomeCivil('Nome Civil Completo')
      .withCpf('12345678901')
      .withUrlFoto('https://example.com/foto.jpg')
      .withIdExterno('99999')
      .build()

    expect(parlamentar.nomeCivil).toBe('Nome Civil Completo')
    expect(parlamentar.cpf).toBe('12345678901')
    expect(parlamentar.urlFoto).toBe('https://example.com/foto.jpg')
    expect(parlamentar.idExterno).toBe('99999')
  })

  it('should allow setting null for optional fields', () => {
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withNomeCivil(null)
      .withCpf(null)
      .withUrlFoto(null)
      .build()

    expect(parlamentar.nomeCivil).toBeNull()
    expect(parlamentar.cpf).toBeNull()
    expect(parlamentar.urlFoto).toBeNull()
  })
})
