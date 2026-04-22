import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  Crown,
  Gamepad2,
  Heart,
  Link2,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { API_BASE_URL } from '@/lib/api-origin'
import { SITE_NAME, SITE_NAME_CLASS } from '@/lib/site-brand'

type PublicCreator = {
  slug: string
  displayName: string
  bio: string | null
  whatIDo: string | null
  packagesSummary: string | null
  avatarUrl: string | null
  primaryCategory: string | null
  tiktokUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
}

type SupportCatalogMembershipItem = {
  kind: 'membership'
  id: 'membership'
  title: string
  description: string | null
  monthlyPriceKes: number
}

type SupportCatalogShoutoutItem = {
  kind: 'shoutout'
  id: 'shoutout'
  title: string
  description: string | null
  limits: { minKes: number; minKesWithVideo: number; maxKes: number }
}

type SupportCatalogRewardItem = {
  kind: 'reward'
  id: string
  name: string
  description: string | null
  amountKes: number
  allowSupporterMessage: boolean
  allowVideoClip: boolean
}

type SupportCatalogItem =
  | SupportCatalogMembershipItem
  | SupportCatalogShoutoutItem
  | SupportCatalogRewardItem

async function loadCreator(slug: string): Promise<PublicCreator | null> {
  if (!slug?.trim()) return null
  try {
    const enc = encodeURIComponent(slug.trim())
    const res = await fetch(`${API_BASE_URL}/creator-auth/public/${enc}`, {
      next: { revalidate: 30 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as PublicCreator
  } catch {
    return null
  }
}

async function loadSupportCatalog(creatorSlug: string): Promise<SupportCatalogItem[]> {
  const slug = creatorSlug.trim()
  if (!slug) return []
  try {
    const qs = encodeURIComponent(slug)
    const res = await fetch(`${API_BASE_URL}/subscriptions/support-catalog?creatorSlug=${qs}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const body = (await res.json()) as { items?: SupportCatalogItem[] }
    return Array.isArray(body.items) ? body.items : []
  } catch {
    return []
  }
}

const kes = (n: number) =>
  `KES ${Number.isFinite(n) ? n.toLocaleString() : '0'}`

export default async function CreatorPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [creator, catalog] = await Promise.all([
    loadCreator(slug),
    loadSupportCatalog(slug),
  ])
  if (!creator) notFound()

  const creatorName = creator.displayName || creator.slug
  const category = creator.primaryCategory || 'Gaming creator'
  const bio = creator.bio?.trim() ||
    `${creatorName} shares live sessions, subscriber perks, and creator updates.`
  const whatIDo =
    creator.whatIDo?.trim() ||
    'I create live content, community interactions, and paid experiences for supporters.'
  const packagesSummary =
    creator.packagesSummary?.trim() ||
    'From monthly support to one-off requests, everything runs through a single checkout flow.'

  const highlights = [
    'Membership support for recurring fans',
    'One-off shoutouts and optional clip submissions',
    'Reward tiers with clear fixed pricing',
    'Fast mobile checkout with M-Pesa',
  ]

  const membership = catalog.find(
    (x): x is SupportCatalogMembershipItem => x.kind === 'membership',
  )
  const shoutout = catalog.find(
    (x): x is SupportCatalogShoutoutItem => x.kind === 'shoutout',
  )
  const rewardTiers = catalog.filter(
    (x): x is SupportCatalogRewardItem => x.kind === 'reward',
  )
  const supportOptionsCount = (membership ? 1 : 0) + (shoutout ? 1 : 0) + rewardTiers.length

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-violet-600/18 blur-[100px]" />
        <div className="absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[95px]" />
        <div className="absolute bottom-1/4 left-1/4 h-72 w-72 rounded-full bg-cyan-600/10 blur-[85px]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-white/10 bg-black/25 backdrop-blur-sm">
          <SiteNav creatorSlug={creator.slug} showSupport={false} />
        </div>

        <div className="container mx-auto max-w-6xl px-4 pb-20 pt-8 sm:pt-12">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Creator Portfolio
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                {creatorName}
              </span>
            </h1>

            <p className="mt-3 text-base font-medium text-violet-200/90 sm:text-lg">{category}</p>
            <p className="mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-gray-300 sm:text-base">
              {bio}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/support/${creator.slug}`}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                <Heart className="h-4 w-4" aria-hidden />
                Support
              </Link>
              <Link
                href={`/book/${creator.slug}`}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-500/20"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden />
                Book Session
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                All creators
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500">
                  <Link2 className="h-3 w-3" aria-hidden />
                  Creator URL
                </p>
                <p className="mt-1 text-sm font-semibold text-white">/{creator.slug}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500">
                  <Crown className="h-3 w-3" aria-hidden />
                  Support options
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">{supportOptionsCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500">
                  <Wallet className="h-3 w-3" aria-hidden />
                  Checkout
                </p>
                <p className="mt-1 text-sm font-semibold text-fuchsia-200">M-Pesa ready</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/40">
            <div className="relative aspect-[4/5]">
              <Image
                src={creator.avatarUrl || '/logo.png'}
                alt={creatorName}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-black/45 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wider text-violet-200/80">Now supporting</p>
                <p className="mt-1 text-sm font-semibold text-white">{creatorName}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Creator page</p>
            <p className="mt-2 text-lg font-semibold text-white">/{creator.slug}</p>
            <p className="mt-1 text-sm text-gray-400">Share this URL with your audience.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-400/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Checkout</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">M-Pesa</p>
            <p className="mt-1 text-sm text-gray-400">Fast fan support from mobile.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Platform</p>
            <p className={`mt-2 text-lg text-violet-200 ${SITE_NAME_CLASS}`}>{SITE_NAME}</p>
            <p className="mt-1 text-sm text-gray-400">Creator-first workspace and tools.</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-transparent p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
                <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                Quick action
              </p>
              <p className="mt-1 text-sm text-gray-200">
                Want to support instantly? Open the creator checkout in one tap.
              </p>
            </div>
            <Link
              href={`/support/${creator.slug}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Open support checkout
            </Link>
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-6 shadow-xl shadow-black/20">
            <div className="inline-flex rounded-xl bg-violet-500/20 p-2.5 ring-1 ring-violet-400/25">
              <Gamepad2 className="h-5 w-5 text-violet-200" aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold">What I do</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {whatIDo}
            </p>
            <ul className="mt-5 space-y-3 text-sm text-gray-300">
              {highlights.map((line) => (
                <li key={line} className="flex gap-2.5 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-6 shadow-xl shadow-black/20">
            <div className="inline-flex rounded-xl bg-fuchsia-500/20 p-2.5 ring-1 ring-fuchsia-400/25">
              <CreditCard className="h-5 w-5 text-fuchsia-200" aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold">Packages</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{packagesSummary}</p>
            <div className="mt-5 space-y-3 text-sm text-gray-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30">
                <p className="font-semibold text-white">
                  {membership?.title || 'Member subscription'}
                </p>
                <p className="mt-1 text-gray-400">
                  {membership?.description || 'Recurring monthly support'}
                </p>
                {membership ? (
                  <p className="mt-2 text-emerald-300 font-semibold">
                    {kes(membership.monthlyPriceKes)}/month
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-fuchsia-400/30">
                <p className="font-semibold text-white">
                  {shoutout?.title || 'Live shoutout'}
                </p>
                <p className="mt-1 text-gray-400">
                  {shoutout?.description || 'One-time payment with optional clip URL'}
                </p>
                {shoutout ? (
                  <p className="mt-2 text-fuchsia-300 font-semibold">
                    {kes(shoutout.limits.minKes)} - {kes(shoutout.limits.maxKes)}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        </section>

        {creator.tiktokUrl || creator.instagramUrl || creator.youtubeUrl ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Find me online</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {creator.tiktokUrl ? (
                <a
                  href={creator.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-violet-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  TikTok
                </a>
              ) : null}
              {creator.instagramUrl ? (
                <a
                  href={creator.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-violet-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Instagram
                </a>
              ) : null}
              {creator.youtubeUrl ? (
                <a
                  href={creator.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-violet-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  YouTube
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-xl bg-amber-500/15 p-2.5 ring-1 ring-amber-500/25">
                <Star className="h-5 w-5 text-amber-300" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold">Support tiers</h2>
            </div>
            <Link
              href={`/support/${creator.slug}`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
            >
              Support now
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {rewardTiers.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Custom tiers will appear here once configured in the creator workspace.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rewardTiers.map((tier) => (
                <article
                  key={tier.id}
                  className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-amber-400/40"
                >
                  <p className="text-sm uppercase tracking-wider text-amber-300/90">
                    Tier
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {tier.description || 'Custom creator tier'}
                  </p>
                  <p className="mt-3 text-base font-semibold text-emerald-300">
                    {kes(tier.amountKes)}
                  </p>
                  <Link
                    href={`/support/${creator.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 opacity-0 transition group-hover:opacity-100"
                  >
                    Support this tier
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                    {tier.allowSupporterMessage ? (
                      <span className="rounded-md border border-white/15 px-2 py-1">
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        Message
                      </span>
                    ) : null}
                    {tier.allowVideoClip ? (
                      <span className="rounded-md border border-white/15 px-2 py-1">
                        <Megaphone className="mr-1 inline h-3 w-3" />
                        Clip URL
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-violet-500/[0.04] to-transparent px-6 py-10 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Star className="mx-auto h-8 w-8 text-amber-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-balance sm:text-3xl">
              Support {creatorName} and help grow the stream
            </h2>
            <p className="mt-3 text-gray-300">
              Choose support options, send a shoutout, or book a session where available. Everything routes through
              the same trusted creator flow.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/support/${creator.slug}`}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500 sm:w-auto"
              >
                Start supporting
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/20 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
              >
                Explore more creators
              </Link>
            </div>
          </div>
        </section>
        </div>
      </div>
    </main>
  )
}
