import { Unzip, UnzipInflate, unzipSync } from 'fflate'

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

export interface TseZipEntrySink {
  /** Recebe texto já decodificado de Latin-1, em chunks. */
  write(text: string): void
  /** Fim do entry. */
  end(): void
}

// Variante streaming de downloadTseCsv para zips grandes demais para memória.
// votacao_candidato_munzona: zip nacional de ~500-600MB cujo maior CSV interno
// (SP 2022) tem 1,2GB descomprimido — acima do limite de string do V8
// (~512MB); o BRASIL.csv consolidado chega a 4,3GB. Streaming validado contra
// o zip real (ZIP64) com fflate Unzip em 2026-07-05 (princípio 13).
//
// Entries com `shouldProcess(name) === false` não são nem descomprimidos.
// Devolve os nomes efetivamente processados (o chamador valida cobertura).
export async function streamTseZipEntries(
  zipUrl: string,
  shouldProcess: (entryName: string) => boolean,
  createSink: (entryName: string) => TseZipEntrySink,
): Promise<string[]> {
  const response = await fetchWithRetry(zipUrl, {
    headers: { accept: 'application/zip', 'user-agent': USER_AGENT },
  })
  if (!response.body) {
    throw new Error(`Resposta sem body para ${zipUrl}`)
  }

  const processed: string[] = []
  // Erros lançados dentro de callbacks do fflate (síncronos ao push) precisam
  // subir para o await do chamador — capturados e relançados após o loop.
  let sinkError: unknown

  const unzip = new Unzip()
  unzip.register(UnzipInflate)
  unzip.onfile = (file) => {
    if (!shouldProcess(file.name)) return
    processed.push(file.name)
    const decoder = new TextDecoder('latin1')
    const sink = createSink(file.name)
    file.ondata = (err, data, final) => {
      try {
        if (err) throw err
        const text = decoder.decode(data, { stream: !final })
        if (text.length > 0) sink.write(text)
        if (final) sink.end()
      } catch (e) {
        sinkError ??= e
      }
    }
    file.start()
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    unzip.push(value, false)
    if (sinkError) break
  }
  unzip.push(new Uint8Array(0), true)
  if (sinkError) {
    throw sinkError instanceof Error ? sinkError : new Error(String(sinkError))
  }
  return processed
}
