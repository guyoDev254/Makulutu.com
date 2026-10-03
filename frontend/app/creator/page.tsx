'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  clearCreatorSession,
  creatorAuthApi,
  getCreatorToken,
} from '@/lib/creator-auth'

/**
 * After login/signup: send incomplete profiles to onboarding, completed profiles to workspace.
 */
export default function CreatorHubPage() {
  const router = useRouter()

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
        router.replace(
          me.onboardingComplete ? '/creator/workspace' : '/creator/dashboard',
        )
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-8 text-white">
      <p className="text-sm text-gray-400">Loading your dashboard…</p>
    </main>
  )
}
