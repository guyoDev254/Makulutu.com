'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CreditCard,
  Gift,
  Radio,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { HomeCreatorSearch } from '@/components/HomeCreatorSearch'
import { SiteNav } from '@/components/SiteNav'
import { API_BASE_URL } from '@/lib/api-origin'
import { effectiveCreatorSearchQuery, matchesCreatorSearch, type PublicCreator } from '@/lib/creator-search'
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_CLASS, SITE_TAGLINE } from '@/lib/site-brand'

function CreatorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse">
      <div className="h-56 bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="h-6 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
        <div className="h-12 w-full rounded bg-white/5" />
      </div>
      <style jsx>{`
        .flag-marquee-track {
          animation: marqueeFlags 28s linear infinite;
        }

        @keyframes marqueeFlags {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}

export default function PlatformHomePage() {
  const [creators, setCreators] = useState<PublicCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [creatorSearch, setCreatorSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/creator-auth/public`)
        const rows = (await res.json().catch(() => [])) as PublicCreator[]
        if (!cancelled && Array.isArray(rows)) setCreators(rows)
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const creatorSearchForMatch = effectiveCreatorSearchQuery(creatorSearch)

  const creatorCards = useMemo(() => {
    if (!creatorSearchForMatch) return creators
    return creators.filter((c) => matchesCreatorSearch(c, creatorSearchForMatch))
  }, [creators, creatorSearchForMatch])
  const africanFlags = [
    { flag: '🇰🇪', country: 'Kenya' },
    { flag: '🇳🇬', country: 'Nigeria' },
    { flag: '🇿🇦', country: 'South Africa' },
    { flag: '🇬🇭', country: 'Ghana' },
    { flag: '🇹🇿', country: 'Tanzania' },
    { flag: '🇺🇬', country: 'Uganda' },
    { flag: '🇪🇹', country: 'Ethiopia' },
    { flag: '🇷🇼', country: 'Rwanda' },
    { flag: '🇪🇬', country: 'Egypt' },
    { flag: '🇸🇳', country: 'Senegal' },
    { flag: '🇨🇲', country: 'Cameroon' },
    { flag: '🇩🇿', country: 'Algeria' },
  ] as const

  const features = [
    {
      icon: CreditCard,
      title: 'M-Pesa checkout',
      body: 'Fans pay with STK Push. Subscriptions, shoutouts, and support tiers are tracked per creator.',
      accent: 'text-emerald-300',
      ring: 'ring-emerald-500/20',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Radio,
      title: 'OBS & live alerts',
      body: 'Browser sources, test alerts, and optional unique stream links so overlays stay under each creator’s control.',
      accent: 'text-fuchsia-300',
      ring: 'ring-fuchsia-500/20',
      bg: 'bg-fuchsia-500/10',
    },
    {
      icon: Gift,
      title: 'Tiers & shoutouts',
      body: 'Configurable reward tiers, stream shoutouts with optional clips, and replay tools for your mods.',
      accent: 'text-amber-300',
      ring: 'ring-amber-500/20',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Shield,
      title: 'Scoped workspaces',
      body: 'Each creator sees their own revenue, subscribers, and payments. Platform tools stay separate from fan-facing pages.',
      accent: 'text-cyan-300',
      ring: 'ring-cyan-500/20',
      bg: 'bg-cyan-500/10',
    },
    {
      icon: Users,
      title: 'Public profiles',
      body: 'Every creator gets a shareable URL for support, membership, and booking flows—consistent branding across the network.',
      accent: 'text-violet-300',
      ring: 'ring-violet-500/20',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Zap,
      title: 'Fast onboarding',
      body: 'Sign up, finish your profile, and open the workspace to manage tiers, OBS links, and payouts logic in one place.',
      accent: 'text-yellow-300',
      ring: 'ring-yellow-500/20',
      bg: 'bg-yellow-500/10',
    },
  ] as const

  const steps = [
    {
      n: '1',
      title: 'Pick a creator',
      body: 'Browse the directory or open a creator’s link. You’ll land on their public profile and support options.',
    },
    {
      n: '2',
      title: 'Choose how to support',
      body: 'Membership, one-off shoutouts, or coaching-style bookings—depending on what that creator has enabled.',
    },
    {
      n: '3',
      title: 'Pay on your phone',
      body: 'Complete M-Pesa on the device you trust. You’ll get confirmation and any follow-up details from the creator’s flow.',
    },
  ] as const

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-violet-600/18 blur-[100px]" />
        <div className="absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-fuchsia-600/14 blur-[90px]" />
        <div className="absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full bg-cyan-600/10 blur-[80px]" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,15,0.4)_50%,#0a0a0f_100%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10">
        <SiteNav
          showSupport={false}
          showBook={false}
          showAuthButtons
          creatorSearchSlot={
            !loading && creators.length > 0 ? (
              <HomeCreatorSearch
                creators={creators}
                query={creatorSearch}
                onQueryChange={setCreatorSearch}
              />
            ) : undefined
          }
        />

        <main className="container mx-auto max-w-7xl px-4 pb-20 pt-8 sm:pb-28 sm:pt-12">
          {/* Hero */}
          <header className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {SITE_TAGLINE}
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                The home for your supporters
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-gray-400 sm:text-lg">
              {SITE_DESCRIPTION}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href="#creators"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500"
              >
                Browse creators
                <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
              </a>
              <Link
                href="/creator/login"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Creator login
              </Link>
              <Link
                href="/creator/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-500/20"
              >
                Get started
              </Link>
            </div>
          </header>

          {/* Africa platform banner */}
          <section className="mx-auto mt-12 max-w-5xl" aria-label="Africa platform banner">
            <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-r from-violet-950/45 via-[#10101a] to-fuchsia-950/35 p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                One platform across Africa
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Built for creators and supporters across the continent
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
                One unified creator platform for Africa: discover creators, support them with trusted checkout,
                and grow communities from one place.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/25 py-3">
                <div className="flag-marquee-track flex w-max items-center gap-3 px-3">
                  {[...africanFlags, ...africanFlags].map((item, idx) => (
                    <span
                      key={`${item.country}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-100"
                    >
                      <span className="text-lg leading-none" role="img" aria-label={item.country}>
                        {item.flag}
                      </span>
                      <span className="text-xs font-medium text-gray-300 sm:text-sm">{item.country}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="mt-20" aria-labelledby="features-heading">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="features-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Everything fans and creators expect
              </h2>
              <p className="mt-3 text-gray-400">
                One stack for discovery, checkout, and stream-side tools—without mixing one creator’s data with
                another’s.
              </p>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, body, accent, ring, bg }) => (
                <li
                  key={title}
                  className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ring-1 ${ring} transition hover:bg-white/[0.05]`}
                >
                  <div className={`inline-flex rounded-xl ${bg} p-2.5 ring-1 ring-white/10`}>
                    <Icon className={`h-5 w-5 ${accent}`} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* How it works */}
          <section className="mt-20" aria-labelledby="how-heading">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                How supporting works
              </h2>
              <p className="mt-3 text-gray-400">Three steps from landing on the site to a completed checkout.</p>
            </div>
            <ol className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <li
                  key={s.n}
                  className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-6 py-8 text-center"
                >
                  <span
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white"
                    aria-hidden
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Creator CTA band */}
          <section className="mt-20 overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 via-[#15151f] to-fuchsia-950/30 px-6 py-12 sm:px-10 sm:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-balance sm:text-3xl">Streaming already? Claim your page.</h2>
              <p className="mt-3 text-gray-400">
                Publish your profile, turn on support tiers, and manage revenue and OBS from a dedicated workspace—while
                we keep fan checkout simple.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/creator/signup"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-semibold text-violet-950 shadow-lg hover:bg-gray-100 sm:w-auto"
                >
                  Create free account
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/25 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
                >
                  Read about the platform
                </Link>
              </div>
            </div>
          </section>

          {/* Creators directory */}
          <section id="creators" className="mt-20 scroll-mt-24">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Creators on <span className={SITE_NAME_CLASS}>{SITE_NAME}</span>
              </h2>
              <p className="mt-1 text-gray-400">
                Open a profile to subscribe, send a shoutout, or follow their booking links.
              </p>
            </div>

            {loading ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <CreatorCardSkeleton />
                <CreatorCardSkeleton />
                <CreatorCardSkeleton />
              </div>
            ) : creators.length === 0 ? (
              <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-8 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
                  <Users className="h-7 w-7 text-violet-300" aria-hidden />
                </div>
                <p className="mt-6 text-lg font-semibold text-white">Directory is warming up</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Public profiles appear here once creators sign up and complete onboarding. Be the first on the
                  network or share this page with your team.
                </p>
                <Link
                  href="/creator/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  Create your creator page
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ) : creatorCards.length === 0 ? (
              <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-8 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Search className="h-7 w-7 text-gray-400" aria-hidden />
                </div>
                <p className="mt-6 text-lg font-semibold text-white">No creators match that search</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Try a different name, handle, or category—or clear the search in the header to see everyone again.
                </p>
                <button
                  type="button"
                  onClick={() => setCreatorSearch('')}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <ul className="mt-10 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {creatorCards.map((creator) => (
                  <li key={creator.slug}>
                    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg shadow-black/20 transition hover:border-violet-400/35 hover:bg-white/[0.05]">
                      <div className="relative h-56 overflow-hidden">
                        <Image
                          src={creator.avatarUrl || '/logo.png'}
                          alt={creator.displayName}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 1024px) 100vw, 33vw"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-90"
                          aria-hidden
                        />
                        <div className="absolute bottom-3 left-4 right-4">
                          <span className="inline-flex rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                            Creator
                          </span>
                          <h3 className="mt-1 text-xl font-bold text-white drop-shadow-md">
                            {creator.displayName}
                          </h3>
                          <p className="text-sm text-violet-200/90">
                            {creator.primaryCategory || 'Creator'}
                          </p>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="line-clamp-3 text-sm leading-relaxed text-gray-400">
                          {creator.bio?.trim() || 'Support memberships, shoutouts, and more on their public page.'}
                        </p>
                        <Link
                          href={`/${creator.slug}`}
                          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200"
                        >
                          View profile
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Trust strip */}
          <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-8 sm:px-10">
            <ul className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-10 sm:gap-y-3">
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400/90" aria-hidden />
                Per-creator payouts and reporting
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400/90" aria-hidden />
                Fan checkout stays on the creator you chose
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400/90" aria-hidden />
                Workspace tools separate from public pages
              </li>
            </ul>
          </section>

          <footer className="mt-16 border-t border-white/10 pt-10">
            <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()}{' '}
                <span className={SITE_NAME_CLASS}>{SITE_NAME}</span>. {SITE_TAGLINE}.
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/support" className="hover:text-white">
                  Support
                </Link>
                <Link href="/book" className="hover:text-white">
                  Book
                </Link>
                <Link href="/creator/login" className="hover:text-white">
                  Creator login
                </Link>
              </nav>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
