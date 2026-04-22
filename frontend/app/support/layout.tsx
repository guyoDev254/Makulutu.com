import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Membership, live shoutouts, and fixed-price tiers. Payment by M-Pesa.',
}

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children
}
