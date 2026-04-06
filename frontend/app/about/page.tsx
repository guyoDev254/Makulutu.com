import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ExternalLink,
  Gamepad2,
  Heart,
  MessageCircle,
  Radio,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Video,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'

const SOCIAL = {
  tiktok: 'https://www.tiktok.com/@mohagamer254',
  linktree: 'https://linktr.ee/Mohagamer254',
} as const

export default function About() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 right-0 h-[24rem] w-[24rem] rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute top-1/4 -left-24 h-[20rem] w-[20rem] rounded-full bg-fuchsia-600/15 blur-[90px]" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-500/10 blur-[70px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,15,0.5)_55%,#0a0a0f_100%)]" />
      </div>

      <div className="relative z-10">
        <SiteNav />

        <article className="container mx-auto max-w-6xl px-4 pb-20 pt-4 sm:pb-24 sm:pt-6 md:pb-28">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-fuchsia-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>

          {/* Hero */}
          <header className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Radio className="h-3.5 w-3.5 text-fuchsia-400" aria-hidden />
              About
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                Moha
              </span>
              <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Gamer
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 text-pretty sm:text-xl">
              Licensed <span className="text-gray-300">FIFAe</span> coach, official coach of Team
              Kenya (FIFAe), and part of the{' '}
              <span className="text-gray-300">eFootball Kenya League</span> leadership—plus streams,
              community, and 1:1{' '}
              <span className="text-gray-300">account reviews &amp; rank push</span> when you want
              direct help.
            </p>
          </header>

          {/* Credentials */}
          <section className="mx-auto mt-10 max-w-3xl" aria-labelledby="profile-credentials-heading">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-[#12121a] to-transparent p-6 sm:p-8">
              <div
                className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-amber-500/15 p-3 ring-1 ring-amber-500/25">
                    <Shield className="h-7 w-7 text-amber-300" aria-hidden />
                  </div>
                  <div>
                    <h2
                      id="profile-credentials-heading"
                      className="text-xl font-bold text-white sm:text-2xl"
                    >
                      Profile &amp; credentials
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Competitive football sims, national-team work, and Kenya&apos;s league scene.
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3.5 text-sm text-gray-300 sm:text-base">
                  {[
                    'Licensed FIFAe coach',
                    'Official coach of Team Kenya (FIFAe)',
                    'Admin for the eFootball Kenya League',
                    'Community leader',
                    'Esports community builder',
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <BadgeCheck
                        className="mt-0.5 h-5 w-5 shrink-0 text-amber-400/90"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Story + highlights */}
          <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-10 lg:items-start">
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:p-10">
                <div
                  className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-6 inline-flex rounded-xl bg-violet-500/15 p-3 ring-1 ring-violet-500/25">
                    <Gamepad2 className="h-8 w-8 text-violet-300" aria-hidden />
                  </div>
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">My story</h2>
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-300 sm:text-lg">
                    <p>
                      Welcome to my corner of the internet. I&apos;m a passionate eFootball player
                      and licensed FIFAe coach—I work with Team Kenya on the FIFAe side, help steer
                      the eFootball Kenya League as an admin, and build spaces where competitive
                      players and casual fans can grow together. It started with football and gaming,
                      and grew into sharing matches, mistakes, and wins with people who get it.
                    </p>
                    <p>
                      On stream I want you entertained, a little smarter about the meta, and part of
                      a crew that actually talks tactics and laughs at the same bugs. I also do{' '}
                      <strong className="font-semibold text-gray-200">
                        account reviews and rank-push coaching
                      </strong>{' '}
                      if you want your squad and settings audited or a focused plan to climb—book a
                      slot from the site and we&apos;ll confirm on WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-4 lg:col-span-5">
              <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/40 to-transparent p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
                  On stream
                </p>
                <ul className="mt-4 space-y-3 text-sm text-gray-300">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    Live eFootball &amp; ranked grind
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    Tutorials &amp; breakdowns you can use
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    Community on WhatsApp &amp; Discord
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    1:1 account reviews &amp; rank push (book online)
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { n: 'FIFAe · Kenya', l: 'National team coaching' },
                  { n: 'League admin', l: 'eFootball Kenya League' },
                  { n: 'Live + VOD', l: 'Content' },
                  { n: 'Community', l: 'Members & chat' },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left"
                  >
                    <p className="text-sm font-semibold text-white">{s.n}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {/* Cards row */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/30 to-white/[0.02] p-6 sm:p-7">
              <div className="inline-flex rounded-lg bg-amber-500/15 p-2.5 ring-1 ring-amber-500/20">
                <Trophy className="h-7 w-7 text-amber-400" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Highlights</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="text-amber-400/90">▸</span>
                  Competitive eFootball focus
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400/90">▸</span>
                  Long-term grind &amp; consistency
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400/90">▸</span>
                  Tournament &amp; clutch moments
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400/90">▸</span>
                  Active on TikTok &amp; streams
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/25 to-white/[0.02] p-6 sm:p-7">
              <div className="inline-flex rounded-lg bg-cyan-500/15 p-2.5 ring-1 ring-cyan-500/20">
                <Video className="h-7 w-7 text-cyan-400" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">What I make</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="text-cyan-400/90">▸</span>
                  Live matches &amp; sessions
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400/90">▸</span>
                  Gameplay tutorials
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400/90">▸</span>
                  Strategy &amp; meta talk
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400/90">▸</span>
                  Community challenges
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400/90">▸</span>
                  Account reviews &amp; rank push (bookable)
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-950/35 to-white/[0.02] p-6 sm:p-7 sm:col-span-2 lg:col-span-1">
              <div className="inline-flex rounded-lg bg-violet-500/15 p-2.5 ring-1 ring-violet-500/20">
                <Users className="h-7 w-7 text-violet-300" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">The community</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Subscribers get closer access: member streams, WhatsApp, and Discord for lobbies,
                patch-day talk, and hanging out between broadcasts.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={SOCIAL.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-fuchsia-500/30 hover:text-white"
                >
                  TikTok
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                </a>
                <a
                  href={SOCIAL.linktree}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-cyan-500/30 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  All links
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                </a>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/50 via-fuchsia-900/25 to-transparent px-6 py-12 text-center sm:px-10 sm:py-14">
            <MessageCircle className="mx-auto h-11 w-11 text-fuchsia-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-balance sm:text-3xl">Join the community</h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-300 text-pretty">
              Subscribe for exclusive access, member streams, and our WhatsApp &amp; Discord spaces.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/subscribe"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-950 shadow-lg transition hover:bg-gray-100 sm:w-auto"
              >
                <Heart className="h-5 w-5 text-fuchsia-600" aria-hidden />
                Subscribe
              </Link>
              <Link
                href="/book"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-8 py-3.5 text-base font-semibold text-emerald-100 transition hover:bg-emerald-500/25 sm:w-auto"
              >
                <CalendarCheck className="h-5 w-5" aria-hidden />
                Book coaching
              </Link>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Home
                <ArrowRight className="h-5 w-5 opacity-80" aria-hidden />
              </Link>
            </div>
          </div>
        </article>

        <footer className="border-t border-white/10 bg-black/30">
          <div className="container mx-auto max-w-6xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white">MohaGamer</p>
                <p className="mt-1 text-sm text-gray-500">
                  Licensed FIFAe coach · Team Kenya · eFootball Kenya League
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <Link href="/subscribe" className="hover:text-white">
                  Subscribe
                </Link>
                <Link href="/book" className="hover:text-white">
                  Book
                </Link>
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
