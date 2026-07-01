import { Card } from '@fabio.caffarello/react-design-system/server'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function FilterPanel({ children }: Props) {
  return (
    <Card className="space-y-4" padding="medium" variant="default">
      {children}
    </Card>
  )
}
