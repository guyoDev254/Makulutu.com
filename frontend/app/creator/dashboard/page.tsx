'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreatorProfileSettings } from '@/components/creator/CreatorProfileSettings'
import {
  clearCreatorSession,
  creatorAuthApi,
  getCreatorToken,
} from '@/lib/creator-auth'

/**
 * First-time onboarding only. Completed creators are redirected to `/creator/workspace`.
 */
export default function CreatorOnboardingPage() {
  const router = useRouter()
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'redirect'>('loading')

  useEffect(() => {
    const token = getCreatorToken()
    if (!token) {
      router.replace('/creator/login')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const me = await creatorAuthApi.me()
        if (cancelled) return
        if (me.onboardingComplete) {
          setGate('redirect')
          router.replace('/creator/workspace')
          return
        }
        setGate('onboarding')
      } catch {
        if (!cancelled) {
          clearCreatorSession()
          router.replace('/creator/login')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (gate === 'loading' || gate === 'redirect') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-8 text-white">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    )
  }

  return <CreatorProfileSettings mode="onboarding" />
}
