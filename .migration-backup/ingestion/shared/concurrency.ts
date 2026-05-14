// Worker pool simples: mantém até `concurrency` promises ativas; cada item
// novo só é processado quando uma vaga abre. Aceita Iterable ou AsyncIterable
// (pra cobrir tanto Array quanto AsyncGenerator de paginação).
//
// Erros NÃO devem propagar do `fn` — handlers de ingestão tipicamente
// populam `stats.errors` e retornam normalmente. Se um `fn` rejeitar, o
// pool aborta na próxima `Promise.race`, comportamento intencional.

export async function runWithConcurrency<T>(
  items: Iterable<T> | AsyncIterable<T>,
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const workers = new Set<Promise<unknown>>()
  for await (const item of items as AsyncIterable<T>) {
    const promise = fn(item).finally(() => workers.delete(promise))
    workers.add(promise)
    if (workers.size >= concurrency) {
      await Promise.race(workers)
    }
  }
  await Promise.all(workers)
}
