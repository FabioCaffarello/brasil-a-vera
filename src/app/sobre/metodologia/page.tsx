import { permanentRedirect } from 'next/navigation'

// A metodologia consolidada vive em /docs/metodologia desde a Sprint 14.3
// (sidebar do /docs + cobertura do smoke probe docs-anchors). Esta rota
// permanece como redirect permanente: era linkada do footer e de páginas de
// ranking desde a criação, e pode ter links externos apontando para cá.
export default function MetodologiaRedirect() {
  permanentRedirect('/docs/metodologia')
}
