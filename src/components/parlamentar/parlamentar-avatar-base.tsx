import { AvatarBase } from '@fabio.caffarello/react-design-system/server'

import { type AvatarSize, iniciais } from '@/lib/iniciais'

interface Props {
  nome: string
  urlFoto: string | null
  size: AvatarSize
  /** `lazy` em listagens (fotos abaixo da dobra). Default eager. */
  loading?: 'lazy' | 'eager'
  className?: string
}

/**
 * Foto de parlamentar **server-safe**, sobre o `AvatarBase` do RDS (#250, v4.8)
 * — sem hooks, renderiza em Server Components zero-JS. `urlFoto` null/ausente →
 * iniciais renderizadas no servidor (upgrade sobre o círculo cinza do
 * `<img>` cru). Trade-off vs `ParlamentarAvatar` (client): imagem que dá 404
 * mostra o ícone de quebrada do browser, sem o swap gracioso para iniciais
 * (esse exige `onError` → client).
 *
 * Use aqui em listas server zero-JS (bancada, top-5, comparar); use o
 * `ParlamentarAvatar` (client) onde já há contexto client (card, drawer, modal).
 */
export function ParlamentarAvatarBase({
  nome,
  urlFoto,
  size,
  loading,
  className,
}: Props) {
  return (
    <AvatarBase
      alt=""
      aria-label={`Foto de ${nome}`}
      className={className}
      fallback={iniciais(nome)}
      loading={loading}
      size={size}
      src={urlFoto ?? undefined}
      variant="circle"
    />
  )
}
