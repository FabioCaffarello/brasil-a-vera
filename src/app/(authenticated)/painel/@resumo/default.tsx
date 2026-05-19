// Fallback exigido pelo Next.js para Parallel Routes (RFC §3).
// Com query-param routing, default só dispara em casos degenerados;
// `null` é o handler correto.
export default function ResumoDefault() {
  return null
}
