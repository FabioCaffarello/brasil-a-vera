// Idade a partir da data de nascimento (ADR-049). Pura: recebe `hoje` para ser
// determinística e testável. 'YYYY-MM-DD' → anos completos; null se inválida.

export function calcularIdade(
  dataNascimento: string,
  hoje: Date,
): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataNascimento.trim())
  if (!m) return null
  const ano = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])

  let idade = hoje.getUTCFullYear() - ano
  const mesHoje = hoje.getUTCMonth() + 1
  const diaHoje = hoje.getUTCDate()
  if (mesHoje < mes || (mesHoje === mes && diaHoje < dia)) idade--

  return idade >= 0 && idade < 130 ? idade : null
}
