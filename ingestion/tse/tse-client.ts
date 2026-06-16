import { unzipSync } from 'fflate'

import { fetchWithRetry } from '../shared/http'

// Cliente dos dados abertos do TSE. Diferente da Câmara/Senado (APIs JSON),
// o TSE publica ZIPs de CSV. Baixamos com retry/backoff (APIs públicas BR são
// instáveis — CLAUDE.md) e descomprimimos em memória (arquivos pequenos:
// poucos MB; o BRASIL.csv chega a ~23MB descomprimido — ok para Node).

const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

// Baixa um .zip do TSE e devolve o conteúdo de UM arquivo interno, já
// decodificado de Latin-1 (encoding real dos CSVs do TSE) para string UTF-8.
// O `filter` do fflate evita descomprimir os 26 CSVs por-UF que não usamos.
export async function downloadTseCsv(
  zipUrl: string,
  entryName: string,
): Promise<string> {
  const response = await fetchWithRetry(zipUrl, {
    headers: { accept: 'application/zip', 'user-agent': USER_AGENT },
  })
  const buf = new Uint8Array(await response.arrayBuffer())
  const files = unzipSync(buf, { filter: (file) => file.name === entryName })
  const entry = files[entryName]
  if (!entry) {
    throw new Error(`Arquivo "${entryName}" não encontrado no zip ${zipUrl}`)
  }
  return new TextDecoder('latin1').decode(entry)
}
