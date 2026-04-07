import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  ExternalLink,
  Gamepad2,
  Heart,
  MessageCircle,
  Mic2,
  Radio,
  Sparkles,
  Trophy,
  TrendingUp,
  Video,
  Youtube,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { PlatformBrand } from '@/components/PlatformBrand'

const SOCIAL = {
  tiktok: 'https://www.tiktok.com/@mohagamer254',
  linktree: 'https://linktr.ee/Mohagamer254',
  youtube: 'https://www.youtube.com/@Mohagamer_254',
} as const

const discordInviteRaw = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim()
const DISCORD_HREF = discordInviteRaw?.length ? discordInviteRaw : SOCIAL.linktree

/** Portraits, mobile clip, studio, and desk setup — assets in `/public`. */
const IMAGES = {
  hero: '/moha-portrait.png',
  pitch: '/moha-mobile-game.png',
  arena: '/moha-studio.png',
  lounge: '/moha-gaming-setup.png',
  membersTop: '/moha-gaming-setup.png',
} as const

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64v-3.4a6.34 6.34 0 0 0-1-.09A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-[100px]" />
        <div className="absolute top-1/3 -right-20 h-[22rem] w-[22rem] rounded-full bg-fuchsia-600/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-[80px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,15,0.4)_50%,#0a0a0f_100%)]" />
      </div>

      <div className="relative z-10">
        <SiteNav />

        {/* Hero */}
        <section className="container mx-auto max-w-6xl px-4 pt-6 pb-10 sm:pt-10 sm:pb-14 md:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-violet-200/90 backdrop-blur-sm sm:text-sm">
                <Radio className="h-3.5 w-3.5 text-fuchsia-400" aria-hidden />
                FIFAe · Team Kenya · eFootball Kenya League
              </p>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl lg:leading-[1.05]">
                <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                  Moha
                </span>
                <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Gamer
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-pretty text-gray-400 sm:text-lg md:text-xl">
                Licensed FIFAe coach, official coach of Team Kenya (FIFAe), and admin for the
                eFootball Kenya League. I stream eFootball, break down skills, offer{' '}
                <span className="text-gray-300">account reviews &amp; rank push</span> sessions, and
                hang with a community that loves the game. Subscribe for members-only access, join us
                on <span className="text-gray-300">WhatsApp &amp; Discord</span>, or grab a shoutout
                when I&apos;m live.
              </p>
              <div className="mt-8 flex w-full max-w-md flex-col flex-wrap gap-3 sm:max-w-none sm:flex-row lg:justify-start">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
                >
                  Subscribe &amp; join
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
              >
                My story
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-3.5 text-base font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
              >
                <CalendarCheck className="h-5 w-5" aria-hidden />
                Book review / rank
              </Link>
            </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start sm:gap-4">
                <a
                  href={SOCIAL.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-fuchsia-500/40 hover:text-white"
                >
                  <TikTokIcon className="h-5 w-5 text-fuchsia-400" />
                  TikTok
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
                <a
                  href={SOCIAL.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-red-500/40 hover:text-white"
                >
                  <Youtube className="h-5 w-5 text-red-500" aria-hidden />
                  YouTube
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
                <a
                  href={DISCORD_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-indigo-400/50 hover:text-white"
                >
                  <DiscordIcon className="h-5 w-5 text-indigo-400" />
                  Discord
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
                <a
                  href={SOCIAL.linktree}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-cyan-500/40 hover:text-white"
                >
                  <Sparkles className="h-5 w-5 text-cyan-400" aria-hidden />
                  All links
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
              </div>
            </div>

            <div className="order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0 lg:max-w-none">
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-500/30 opacity-60 blur-sm"
                  aria-hidden
                />
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-violet-950/50 sm:aspect-[16/11] lg:aspect-[4/5]">
                  <Image
                    src={IMAGES.hero}
                    alt="MohaGamer in studio with Création Africa jersey"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/90 via-[#0a0a0f]/20 to-transparent"
                    aria-hidden
                  />
                  <p className="absolute bottom-4 left-4 right-4 text-left text-sm font-medium text-white/90 drop-shadow-md">
                    eFootball · Live vibes · Community first
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Image gallery */}
        <section className="container mx-auto max-w-6xl px-4 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative h-52 overflow-hidden rounded-2xl border border-white/10 sm:h-56">
              <Image
                src={IMAGES.pitch}
                alt="MohaGamer holding a phone showing a football game"
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="relative h-52 overflow-hidden rounded-2xl border border-white/10 sm:h-56">
              <Image
                src={IMAGES.arena}
                alt="MohaGamer in studio with red accent lighting"
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <div className="relative h-52 overflow-hidden rounded-2xl border border-white/10 sm:h-56 sm:col-span-1">
              <Image
                src={IMAGES.lounge}
                alt="Dual-monitor PC gaming setup with MG branding, microphone, and RGB lighting"
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
          </div>
        </section>

        {/* Quick stats strip */}
        <section className="border-y border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
              {[
                { label: 'Focus', value: 'eFootball' },
                { label: 'Content', value: 'Live + VOD' },
                { label: 'Community', value: 'WhatsApp · Discord' },
                { label: 'Support', value: 'M-Pesa' },
              ].map((item) => (
                <div key={item.label} className="text-center md:text-left">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white sm:text-xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section className="container mx-auto max-w-6xl px-4 py-16 sm:py-20 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-balance sm:text-3xl md:text-4xl">
              What you get here
            </h2>
            <p className="mt-3 text-gray-400 text-pretty sm:text-lg">
              Built for viewers who want more than a follow button—real access and a seat in the
              community.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:gap-5">
            <div className="group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 to-[#12121a] lg:row-span-2">
              <div className="relative h-40 w-full sm:h-44 lg:h-48">
                <Image
                  src={IMAGES.membersTop}
                  alt="Streaming desk with dual monitors, gaming PC, and peripherals"
                  fill
                  className="object-cover opacity-80 transition group-hover:opacity-100"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-violet-950 via-violet-950/60 to-transparent"
                  aria-hidden
                />
              </div>
              <div className="relative flex flex-col p-6 sm:p-8 lg:flex-1 lg:justify-between lg:pb-8">
                <div>
                  <div className="inline-flex rounded-lg bg-violet-500/20 p-3">
                    <Video className="h-7 w-7 text-violet-300" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-xl font-bold sm:text-2xl">Members &amp; streams</h3>
                  <p className="mt-3 text-gray-400 leading-relaxed">
                    Subscribe for exclusive streams, tutorials, the WhatsApp group, and Discord—so
                    you never miss setups, patch notes, or lobby codes.
                  </p>
                </div>
                <Link
                  href="/subscribe"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200 lg:mt-8"
                >
                  View plans
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-fuchsia-500/25 hover:bg-white/[0.05]">
              <div className="relative h-36 w-full">
                <Image
                  src={IMAGES.pitch}
                  alt="MohaGamer with phone — football game on screen"
                  fill
                  className="object-cover opacity-70"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] to-transparent" />
              </div>
              <div className="p-6">
                <Gamepad2 className="h-9 w-9 text-fuchsia-400" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">Gameplay depth</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Skills, formations, and meta—explained the way you&apos;ll actually use them in
                  ranked and friendlies.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-500/25 hover:bg-white/[0.05]">
              <Mic2 className="h-9 w-9 text-cyan-400" aria-hidden />
              <h3 className="mt-4 text-lg font-bold">Shoutouts on stream</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Want your name on stream? Send a paid shoutout with an optional TikTok clip—separate
                from subscription.
              </p>
              <Link
                href="/subscribe"
                className="mt-4 inline-flex text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Shoutout checkout →
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] sm:col-span-2 lg:col-span-2 lg:col-start-2">
              <div className="flex flex-col md:flex-row">
                <div className="relative h-40 w-full shrink-0 md:h-auto md:w-2/5 md:min-h-[200px]">
                  <Image
                    src={IMAGES.arena}
                    alt="MohaGamer studio shot with neon-style lighting"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
                  <div className="flex gap-4">
                    <div className="shrink-0 rounded-lg bg-amber-500/15 p-3">
                      <Trophy className="h-8 w-8 text-amber-400" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Competitive energy</h3>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
                        Tournaments, clutch moments, and the grind—tuned for fans who love
                        competition and clean football on the virtual pitch.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/about"
                    className="shrink-0 text-sm font-semibold text-amber-400/90 hover:text-amber-300"
                  >
                    About me →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1:1 coaching */}
        <section className="container mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
              onStream sessions
            </p>
            <h2 className="mt-2 text-2xl font-bold text-balance sm:text-3xl md:text-4xl">
              Account review &amp; rank push
            </h2>
            <p className="mt-3 text-gray-400 text-pretty sm:text-lg">
              Personal help beyond the stream—book a slot and we&apos;ll sort details on WhatsApp
              (or copy your request if you&apos;re still setting up the number).
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-white/[0.02] p-6 sm:p-8">
              <ClipboardList className="h-10 w-10 text-sky-400" aria-hidden />
              <h3 className="mt-4 text-xl font-bold text-white">Account review</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Squad building, tactics, and settings reviewed with actionable feedback so you can
                fix leaks and play cleaner football.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-950/30 to-white/[0.02] p-6 sm:p-8">
              <TrendingUp className="h-10 w-10 text-emerald-400" aria-hidden />
              <h3 className="mt-4 text-xl font-bold text-white">Rank push</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                A focused plan to climb—matchup tips, mental game, and what to grind between
                sessions.
              </p>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden />
              Book a session
            </Link>
          </div>
        </section>

        {/* Community CTA */}
        <section className="container mx-auto max-w-6xl px-4 pb-16 sm:pb-20 md:pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/40 via-fuchsia-900/20 to-transparent px-6 py-12 sm:px-10 sm:py-14 md:px-14">
            <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <MessageCircle className="h-12 w-12 text-fuchsia-300" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold text-balance sm:text-3xl">
                Ready to join?
              </h2>
              <p className="mt-3 max-w-lg text-gray-300 text-pretty">
                TikTok for clips and lives, Discord and WhatsApp for the crew, and subscribe here
                for the full member experience.
              </p>
              <div className="mt-8 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-950 shadow-lg transition hover:bg-gray-100"
                >
                  <Heart className="h-5 w-5 text-fuchsia-600" aria-hidden />
                  Subscribe
                </Link>
                <a
                  href={DISCORD_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-500/25"
                >
                  <DiscordIcon className="h-5 w-5 text-indigo-300" />
                  Join Discord
                  <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                </a>
                <a
                  href={SOCIAL.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Follow on TikTok
                  <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black/30">
          <div className="container mx-auto max-w-6xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <PlatformBrand
                href="/"
                variant="footer"
                description="Licensed FIFAe coach · Team Kenya · eFootball Kenya League"
              />
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
                <Link href="/subscribe" className="hover:text-white">
                  Subscribe
                </Link>
                <Link href="/book" className="hover:text-white">
                  Book
                </Link>
                <a
                  href={DISCORD_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  Discord
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                </a>
                <a
                  href={SOCIAL.linktree}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  Links
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                </a>
              </div>
            </div>
            <p className="mt-8 text-center text-xs text-gray-600 sm:text-left">
              © {new Date().getFullYear()} MohaGamer. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
