// Mesa Diretora da Câmara dos Deputados e do Senado Federal — Sprint 26.
// Fonte: lideranca_cargo (tipos PRESIDENTE_MESA, VICE_PRESIDENTE_MESA,
// SECRETARIO_MESA, SUPLENTE_MESA), ingestão mensal.
// SSG revalidate 24h — dado quase-estático.

import {
  Breadcrumb,
  HeroSection,
} from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { selecionarMesaVigente } from '@/lib/mesa-vigente'
import { getMesaDiretora } from '@/lib/queries/liderancas'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Mesa Diretora — Brasil à Vera',
  description:
    'Composição atual da Mesa Diretora da Câmara dos Deputados e do Senado Federal — presidência, vice-presidências e secretarias.',
}

const TIPO_LABEL: Record<string, string> = {
  PRESIDENTE_MESA: 'Presidente',
  VICE_PRESIDENTE_MESA: 'Vice-Presidente',
  SECRETARIO_MESA: 'Secretário(a)',
  SUPLENTE_MESA: 'Suplente de Secretário(a)',
}

const TIPO_ORDER: Record<string, number> = {
  PRESIDENTE_MESA: 0,
  VICE_PRESIDENTE_MESA: 1,
  SECRETARIO_MESA: 2,
  SUPLENTE_MESA: 3,
}

function MesaCard({
  entry,
}: {
  entry: Awaited<ReturnType<typeof getMesaDiretora>>[number]
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line-default py-3 last:border-b-0">
      <Link href={`/parlamentares/${entry.parlamentarId}`} tabIndex={-1}>
        <ParlamentarAvatar
          className="size-10"
          loading="lazy"
          nome={entry.parlamentarNome}
          size="sm"
          urlFoto={entry.parlamentarUrlFoto}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          className="font-medium text-fg-primary text-sm hover:underline"
          href={`/parlamentares/${entry.parlamentarId}`}
        >
          {entry.parlamentarNome}
        </Link>
        <p className="text-fg-tertiary text-xs">
          {entry.parlamentarPartidoSigla ?? '—'}/{entry.parlamentarUf}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-subtle px-2.5 py-0.5 text-fg-secondary text-xs">
        {TIPO_LABEL[entry.tipo] ?? entry.tipo}
      </span>
    </li>
  )
}

export default async function MesaDiretoraPage() {
  // selecionarMesaVigente: a fonte deixa biênios anteriores com data_fim
  // NULL (dois "Presidente" em prod) — auditoria UX 2026-07-20, P1.5.
  const membros = selecionarMesaVigente(await getMesaDiretora())

  const camara = membros
    .filter((m) => m.casa === 'CAMARA')
    .sort((a, b) => (TIPO_ORDER[a.tipo] ?? 9) - (TIPO_ORDER[b.tipo] ?? 9))

  const senado = membros
    .filter((m) => m.casa === 'SENADO')
    .sort((a, b) => (TIPO_ORDER[a.tipo] ?? 9) - (TIPO_ORDER[b.tipo] ?? 9))

  return (
    <>
      <div className="mx-auto max-w-3xl pt-8">
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Institucional' },
            { label: 'Mesa Diretora' },
          ]}
        />
      </div>
      {/* P2.10 (auditoria UX 2026-07-20): header padronizado no
          HeroSection centralizado, como nas rotas core. */}
      <HeroSection
        align="center"
        description={
          'Composição atual da Mesa Diretora da Câmara dos Deputados e do Senado Federal. Eleita pelos pares no início de cada biênio da legislatura, responde pela condução dos trabalhos legislativos e pela administração da Casa.'
        }
        title="Mesa Diretora"
        variant="plain"
      />
      <div className="mx-auto max-w-3xl pb-8">
        <div className="space-y-8">
          {camara.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-fg-primary text-lg">
                Câmara dos Deputados
              </h2>
              <div className="rounded-lg border border-line-default bg-surface-base">
                <ul aria-label="Mesa Diretora da Câmara dos Deputados">
                  {camara.map((m) => (
                    <MesaCard key={`${m.tipo}-${m.parlamentarId}`} entry={m} />
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-semibold text-fg-primary text-lg">
              Senado Federal
            </h2>
            {senado.length > 0 ? (
              <div className="rounded-lg border border-line-default bg-surface-base">
                <ul aria-label="Mesa Diretora do Senado Federal">
                  {senado.map((m) => (
                    <MesaCard key={`${m.tipo}-${m.parlamentarId}`} entry={m} />
                  ))}
                </ul>
              </div>
            ) : (
              // Seção sempre presente: a página promete as duas casas no intro;
              // esconder o Senado em silêncio lia como bug (auditoria UX, P1.5).
              <p className="rounded-lg border border-line-default border-dashed bg-surface-base/50 p-4 text-fg-tertiary text-sm">
                A composição da Mesa do Senado ainda não está integrada — a
                fonte oficial do Senado não expõe esses cargos no mesmo formato
                da Câmara. Enquanto isso, consulte o site oficial do Senado
                Federal.
              </p>
            )}
          </section>

          {membros.length === 0 && (
            <p className="text-fg-tertiary text-sm">
              Nenhum membro da Mesa Diretora registrado na base atual.
            </p>
          )}
        </div>

        <p className="mt-8 text-fg-tertiary text-xs">
          Dados atualizados mensalmente via API oficial da Câmara dos Deputados.
          Legislatura {camara[0]?.legislatura ?? senado[0]?.legislatura ?? '—'}.
        </p>
      </div>
    </>
  )
}
