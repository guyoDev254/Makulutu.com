'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import {
  clearCreatorSession,
  creatorAuthApi,
  getCreatorToken,
  setCreatorUserProfile,
  type CreatorProfile,
} from '@/lib/creator-auth'

type Mode = 'onboarding' | 'settings'

export function CreatorProfileSettings({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [form, setForm] = useState({
    displayName: '',
    slug: '',
    bio: '',
    whatIDo: '',
    packagesSummary: '',
    primaryCategory: '',
    avatarUrl: '',
    tiktokUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
  })

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
        setProfile(me)
        setForm({
          displayName: me.displayName || '',
          slug: me.slug || '',
          bio: me.bio || '',
          whatIDo: me.whatIDo || '',
          packagesSummary: me.packagesSummary || '',
          primaryCategory: me.primaryCategory || '',
          avatarUrl: me.avatarUrl || '',
          tiktokUrl: me.tiktokUrl || '',
          instagramUrl: me.instagramUrl || '',
          youtubeUrl: me.youtubeUrl || '',
        })
      } catch {
        if (!cancelled) {
          clearCreatorSession()
          router.replace('/creator/login')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const next = await creatorAuthApi.updateProfile({
        displayName: form.displayName.trim(),
        slug: form.slug.trim().toLowerCase(),
        bio: form.bio.trim() || null,
        whatIDo: form.whatIDo.trim() || null,
        packagesSummary: form.packagesSummary.trim() || null,
        primaryCategory: form.primaryCategory.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
        tiktokUrl: form.tiktokUrl.trim() || null,
        instagramUrl: form.instagramUrl.trim() || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        onboardingComplete: true,
      })
      setCreatorUserProfile(next)
      setProfile(next)
      setForm({
        displayName: next.displayName || '',
        slug: next.slug || '',
        bio: next.bio || '',
        whatIDo: next.whatIDo || '',
        packagesSummary: next.packagesSummary || '',
        primaryCategory: next.primaryCategory || '',
        avatarUrl: next.avatarUrl || '',
        tiktokUrl: next.tiktokUrl || '',
        instagramUrl: next.instagramUrl || '',
        youtubeUrl: next.youtubeUrl || '',
      })

      if (mode === 'onboarding') {
        await Swal.fire({
          icon: 'success',
          title: 'Profile ready',
          text: 'Opening your creator workspace.',
          timer: 1600,
          showConfirmButton: false,
        })
        router.replace('/creator/workspace')
        return
      }

      await Swal.fire({
        icon: 'success',
        title: 'Profile saved',
        timer: 1800,
        showConfirmButton: false,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile'
      setError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Could not save',
        text: msg,
        confirmButtonColor: '#7c3aed',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#0a0a0f] text-white p-8">Loading...</main>
  }

  const isOnboarding = mode === 'onboarding'
  const slugPreview = (form.slug || profile?.slug || '').trim().toLowerCase()
  const displayNamePreview = (form.displayName || profile?.displayName || 'Your name').trim()
  const bioPreview = (form.bio || profile?.bio || '').trim()
  const whatIDoPreview = (form.whatIDo || profile?.whatIDo || '').trim()
  const packagesPreview = (form.packagesSummary || profile?.packagesSummary || '').trim()
  const categoryPreview = (form.primaryCategory || profile?.primaryCategory || '').trim()
  const avatarPreview = (form.avatarUrl || profile?.avatarUrl || '').trim()
  const completionItems = [
    form.displayName.trim().length >= 2,
    slugPreview.length >= 3,
    form.bio.trim().length >= 30,
    form.whatIDo.trim().length >= 40,
    form.packagesSummary.trim().length >= 40,
    form.primaryCategory.trim().length >= 2,
    form.tiktokUrl.trim().length > 0 ||
      form.instagramUrl.trim().length > 0 ||
      form.youtubeUrl.trim().length > 0,
  ]
  const completionPct = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100,
  )

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
              Your public creator page
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              {isOnboarding ? 'Finish your profile' : 'Public profile'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isOnboarding
                ? 'Add how you appear on your public page, then you can manage revenue and alerts in your workspace.'
                : 'Update how fans see you on your public URL. Analytics stay in the workspace.'}
            </p>
            {!isOnboarding ? (
              <Link
                href="/creator/workspace"
                className="mt-3 inline-flex rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition"
              >
                ← Back to workspace
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              clearCreatorSession()
              router.push('/creator/login')
            }}
            className="rounded-lg border border-white/20 bg-white/[0.02] px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            Sign out
          </button>
        </div>

        {profile ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
            <p>
              <span className="text-gray-500">Creator: </span>
              <span className="font-medium text-white">{profile.displayName || profile.slug}</span>
              <span className="text-gray-500"> · Public URL </span>
              <Link className="text-violet-300 hover:text-violet-200 font-medium" href={`/${profile.slug}`}>
                /{profile.slug}
              </Link>
            </p>
            <p className="mt-1 text-xs text-gray-500">Account email: {profile.email}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Profile completeness</span>
              <span>{completionPct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-violet-500 transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              A fuller profile improves trust and conversion on your public page.
            </p>
          </div>
          <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Public URL</p>
            <p className="mt-2 break-all text-sm text-white">/{slugPreview || 'your-slug'}</p>
            <p className="mt-2 text-xs text-gray-400">Use this link in your TikTok/IG/YouTube bio.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 space-y-5"
          >
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">Basic profile</p>
              <p className="mt-1 text-xs text-gray-500">These appear at the top of your public page.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Display name</label>
              <input
                required
                placeholder="How fans know you"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Slug</label>
              <input
                required
                placeholder="public-url-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, hyphens. Example: /{slugPreview || 'yourname'}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Primary category</label>
              <input
                placeholder="eFootball coach, streamer, analyst..."
                value={form.primaryCategory}
                onChange={(e) => setForm((f) => ({ ...f, primaryCategory: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Avatar URL</label>
              <input
                placeholder="https://..."
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">Content details</p>
              <p className="mt-1 text-xs text-gray-500">Help supporters quickly understand who you are and what you offer.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Bio</label>
              <textarea
                placeholder="What you do, your style, and why fans should support you."
                rows={5}
                maxLength={300}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
              <p className="mt-1 text-xs text-gray-500">{form.bio.length}/300</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">What I do</label>
              <textarea
                placeholder="Describe your content style, niche, and the value fans get from following you."
                rows={4}
                maxLength={1200}
                value={form.whatIDo}
                onChange={(e) => setForm((f) => ({ ...f, whatIDo: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
              <p className="mt-1 text-xs text-gray-500">{form.whatIDo.length}/1200</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Packages summary</label>
              <textarea
                placeholder="Explain your support packages, pricing logic, and what each fan experience includes."
                rows={4}
                maxLength={1200}
                value={form.packagesSummary}
                onChange={(e) => setForm((f) => ({ ...f, packagesSummary: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
              />
              <p className="mt-1 text-xs text-gray-500">{form.packagesSummary.length}/1200</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">Social links</p>
              <p className="mt-1 text-xs text-gray-500">Use full URLs so fans can verify your official channels.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-gray-300">TikTok URL</label>
                <input
                  placeholder="https://tiktok.com/@you"
                  value={form.tiktokUrl}
                  onChange={(e) => setForm((f) => ({ ...f, tiktokUrl: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">Instagram URL</label>
                <input
                  placeholder="https://instagram.com/you"
                  value={form.instagramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">YouTube URL</label>
                <input
                  placeholder="https://youtube.com/@you"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div className="sticky bottom-3 z-10 rounded-xl border border-violet-400/20 bg-[#130f1f]/85 p-3 backdrop-blur">
              <button
                disabled={saving}
                className="w-full rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : isOnboarding ? 'Save & open workspace' : 'Save profile'}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:sticky lg:top-6 lg:h-fit">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Public preview</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={displayNamePreview} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold text-white">{displayNamePreview}</p>
                  <p className="text-xs text-violet-300">/{slugPreview || 'your-slug'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-300">{categoryPreview || 'Primary category not set yet.'}</p>
              <p className="mt-2 text-sm text-gray-400">
                {bioPreview || 'Your bio preview appears here once you add it.'}
              </p>
              <p className="mt-3 text-sm text-gray-300">
                {whatIDoPreview || 'Add "What I do" to explain your creator niche and value.'}
              </p>
              <p className="mt-2 text-sm text-gray-400">
                {packagesPreview || 'Add package summary to explain your support options clearly.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {form.tiktokUrl.trim() ? (
                  <span className="rounded-full border border-white/15 px-2 py-1 text-gray-300">TikTok</span>
                ) : null}
                {form.instagramUrl.trim() ? (
                  <span className="rounded-full border border-white/15 px-2 py-1 text-gray-300">Instagram</span>
                ) : null}
                {form.youtubeUrl.trim() ? (
                  <span className="rounded-full border border-white/15 px-2 py-1 text-gray-300">YouTube</span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-gray-500">
              <p>Tips:</p>
              <p>• Keep display name consistent with your socials.</p>
              <p>• Use a short, memorable slug.</p>
              <p>• A clear bio increases support conversion.</p>
              <p>• Add social links so fans can verify your channels.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
