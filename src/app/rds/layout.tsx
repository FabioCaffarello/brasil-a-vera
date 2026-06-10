import '@fabio.caffarello/react-design-system/styles'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function RdsStagingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark min-h-screen bg-surface-canvas text-fg-primary">
      {children}
    </div>
  )
}
