import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Gamepad2,
  Heart,
  MessageCircle,
  Radio,
  Shield,
  Users,
  Video,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SITE_DESCRIPTION } from '@/lib/site-brand'

export default function About() {
  return (
    <div className="relative min-h-screen text-white">
      <div className="relative z-10">
        <SiteNav />

        <article className="container mx-auto max-w-6xl px-4 pb-20 pt-4 sm:pb-24 sm:pt-6 md:pb-28">
          <header className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Radio className="h-3.5 w-3.5 text-fuchsia-400" aria-hidden />
              About
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                Built for{' '}
              </span>
              <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                creators at scale
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 text-pretty sm:text-xl">{SITE_DESCRIPTION}</p>
          </header>

          <section
            className="mx-auto mt-12 max-w-3xl"
            aria-labelledby="platform-for-fans-heading"
          >
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-[#12121a] to-transparent p-6 sm:p-8">
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-violet-500/15 p-3 ring-1 ring-violet-500/25">
                    <Users className="h-7 w-7 text-violet-300" aria-hidden />
                  </div>
                  <div>
                    <h2
                      id="platform-for-fans-heading"
                      className="text-xl font-bold text-white sm:text-2xl"
                    >
                      For fans &amp; communities
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Each creator has a public profile for memberships, shoutouts, and optional coaching flows.
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3.5 text-sm text-gray-300 sm:text-base">
                  {[
                    'Discover creators from the home page (or the mobile app)',
                    'M-Pesa checkout where configured — guest checkout stays on the web',
                    'Membership, live shoutouts, and optional 1:1 coaching',
                    'Support tiers and booking requests per creator',
                    'Fans can create a phone account in the mobile app to see memberships',
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <BadgeCheck
                        className="mt-0.5 h-5 w-5 shrink-0 text-violet-400/90"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            className="mx-auto mt-8 max-w-3xl"
            aria-labelledby="platform-for-creators-heading"
          >
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 via-[#12121a] to-transparent p-6 sm:p-8">
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-emerald-500/15 p-3 ring-1 ring-emerald-500/25">
                    <Video className="h-7 w-7 text-emerald-300" aria-hidden />
                  </div>
                  <div>
                    <h2
                      id="platform-for-creators-heading"
                      className="text-xl font-bold text-white sm:text-2xl"
                    >
                      For creators
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Self-serve signup, workspace analytics, and tools that stay scoped to your audience.
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3.5 text-sm text-gray-300 sm:text-base">
                  {[
                    'Creator login and profile onboarding',
                    'Workspace: revenue, subscribers, payments, shoutouts',
                    'Reward tiers and optional overlays for live streams',
                    'Mobile app: wallet, payouts, and fans — full admin stays on the web',
                    'Platform admins operate separately from creator accounts',
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <Gamepad2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/90"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            className="mx-auto mt-8 max-w-3xl"
            aria-labelledby="platform-trust-heading"
          >
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-[#12121a] to-transparent p-6 sm:p-8">
              <div className="relative flex items-start gap-3">
                <div className="inline-flex rounded-xl bg-amber-500/15 p-3 ring-1 ring-amber-500/25">
                  <Shield className="h-7 w-7 text-amber-300" aria-hidden />
                </div>
                <div>
                  <h2
                    id="platform-trust-heading"
                    className="text-xl font-bold text-white sm:text-2xl"
                  >
                    Multi-tenant by design
                  </h2>
                  <p className="mt-2 text-sm text-gray-300 sm:text-base">
                    Checkouts and subscriber data are tied to the creator you support. Site operators use a
                    separate admin area for platform-wide configuration; creators never see other
                    creators&apos; private dashboards.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/50 via-fuchsia-900/25 to-transparent px-6 py-12 text-center sm:px-10 sm:py-14">
            <MessageCircle className="mx-auto h-11 w-11 text-fuchsia-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-balance sm:text-3xl">Get started</h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-300 text-pretty">
              Browse creators on the home page, open support for a specific streamer, or create your own creator
              account.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-950 shadow-lg transition hover:bg-gray-100 sm:w-auto"
              >
                Browse creators
                <ArrowRight className="h-5 w-5 opacity-80" aria-hidden />
              </Link>
              <Link
                href="/support"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/15 px-8 py-3.5 text-base font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25 sm:w-auto"
              >
                <Heart className="h-5 w-5 text-fuchsia-400" aria-hidden />
                Support
              </Link>
              <Link
                href="/book"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-8 py-3.5 text-base font-semibold text-emerald-100 transition hover:bg-emerald-500/25 sm:w-auto"
              >
                <CalendarCheck className="h-5 w-5" aria-hidden />
                Book a session
              </Link>
            </div>
          </div>
        </article>

        <SiteFooter />
      </div>
    </div>
  )
}
