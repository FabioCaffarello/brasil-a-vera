import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda contra remoção acidental do step de migration automática no deploy.
// Histórico: a falta desse step causou ~10min de 5xx em prod após o merge do
// PR #73 (worker novo + schema antigo). Issue #75 documentou e o step foi
// adicionado no PR de fechamento. Este teste falha se alguém remover o step
// ou trocar a ordem — evita re-incidente. Ver docs/contributing/DEPLOYMENT.md.

describe('deploy.yml: db:migrate guard', () => {
  const yaml = readFileSync(
    resolve(__dirname, '../../.github/workflows/deploy.yml'),
    'utf8',
  )

  it('contém step "Apply Drizzle migrations"', () => {
    expect(yaml).toMatch(/name:\s*Apply Drizzle migrations/)
  })

  it('o step executa "npm run db:migrate"', () => {
    expect(yaml).toMatch(/run:\s*npm run db:migrate/)
  })

  it('migration roda antes do build OpenNext', () => {
    const migrateIdx = yaml.indexOf('Apply Drizzle migrations')
    const buildIdx = yaml.indexOf('Build with OpenNext')
    expect(migrateIdx).toBeGreaterThan(-1)
    expect(buildIdx).toBeGreaterThan(-1)
    expect(migrateIdx).toBeLessThan(buildIdx)
  })

  it('migration roda antes do wrangler deploy', () => {
    const migrateIdx = yaml.indexOf('Apply Drizzle migrations')
    const deployIdx = yaml.indexOf('wrangler deploy')
    expect(migrateIdx).toBeLessThan(deployIdx)
  })

  it('o step recebe DIRECT_URL no env', () => {
    const block = yaml.slice(
      yaml.indexOf('Apply Drizzle migrations'),
      yaml.indexOf('Build with OpenNext'),
    )
    expect(block).toMatch(/DIRECT_URL:\s*\$\{\{\s*secrets\.DIRECT_URL\s*\}\}/)
  })
})
