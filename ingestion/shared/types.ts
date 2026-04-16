export type SyncResult = {
  source: string
  started: Date
  finished: Date
  total: number
  synced: number
  errors: number
  errorDetails: Array<{ id: string; error: string }>
}
