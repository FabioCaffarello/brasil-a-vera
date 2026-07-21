// 404 do app — substitui o default do Next (fundo branco, copy em inglês),
// que quebrava o tema dark e não oferecia saída (auditoria UX 2026-07-20,
// P0.1). Server component zero-JS; herda Navbar/Footer do root layout.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { SearchX } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = {
  title: 'Página não encontrada — Brasil à Vera',
}

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-16">
      <div className="w-full">
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/">Ir para o início</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/busca">Buscar na plataforma</Link>
              </Button>
            </div>
          }
          description="O endereço pode ter mudado ou nunca existiu. Use a busca para encontrar parlamentares, proposições e votações."
          icon={SearchX}
          title="Página não encontrada"
        />
      </div>
    </div>
  )
}
