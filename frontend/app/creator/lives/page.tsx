'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Radio } from 'lucide-react'
import { CreatorScheduledLivesPanel } from '@/components/creator/CreatorScheduledLivesPanel'
import { getCreatorToken } from '@/lib/creator-auth'

export default function CreatorLivesPage() {
  const router = useRouter()

  useEffect(() => {
    if (!getCreatorToken()) {
      router.replace('/creator/login')
    }
  }, [router])

  return (
    <main className="min-h-screen bg-canvas text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07070c]/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/creator/workspace"
              className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Workspace
            </Link>
            <Link
              href="/creator/profile"
              className="text-sm text-gray-400 hover:text-white"
            >
              Profile
            </Link>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
              <Radio className="h-5 w-5 text-red-200" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Schedule a live</h1>
              <p className="mt-1 text-sm text-gray-400">
                Set the time, platform, and description. Followers get an inbox alert when you
                publish.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <CreatorScheduledLivesPanel showIntro={false} />
      </div>
    </main>
  )
}
