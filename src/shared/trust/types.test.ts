import { describe, expect, it } from 'vitest'
import { isTrustLevel } from './types'

describe('isTrustLevel', () => {
  it.each(['L1', 'L2', 'L3', 'L4'] as const)('returns true for %s', (level) => {
    expect(isTrustLevel(level)).toBe(true)
  })

  it.each([
    'L0',
    'L5',
    '',
    'invalid',
    null,
    undefined,
    42,
  ])('returns false for %s', (value) => {
    expect(isTrustLevel(value)).toBe(false)
  })
})
