// Formato numérico abreviado em PT-BR.
//
// Para uso em cards/sumários onde "8.852" tem ruído desnecessário e
// "8,8 mil" comunica a mesma magnitude com menos atrito. Para tabelas
// e exports CSV, sempre usar números exatos.
//
// Convenção:
// - < 1000      → número exato com separador de milhar PT-BR
// - >= 1000     → "X,Y mil" (sempre 1 casa decimal)
// - >= 1000000  → "X,Y mi"

const formatter = new Intl.NumberFormat('pt-BR')

export function formatNumeroAbreviado(n: number): string {
  if (n < 1000) return formatter.format(n)
  if (n < 1_000_000) {
    return `${(n / 1000).toFixed(1).replace('.', ',')} mil`
  }
  return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
}
