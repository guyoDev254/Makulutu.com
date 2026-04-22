import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'

const LAST_UPDATED = 'April 17, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SiteNav showBook={false} />
      <main className="container mx-auto max-w-4xl px-4 pb-16 pt-6 sm:pb-24 sm:pt-10">
        <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-sm leading-relaxed text-gray-300">
            These Terms govern your use of Makulutu as a supporter, creator, or visitor. By using
            this website and related services, you agree to these Terms.
          </p>
        </header>

        <section className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <article>
            <h2 className="text-lg font-semibold text-white">1. Platform role</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Makulutu provides tools for creators and supporters, including memberships, shoutouts,
              and related fan support features. We facilitate payment workflows but do not guarantee
              creator performance, content availability, or external platform uptime.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">2. Payments and refunds</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Payments are processed via supported providers such as M-Pesa and PayPal. Prices are
              shown in KES on the platform; some providers may settle in a different currency at
              checkout. Refunds are handled according to creator policy, applicable law, and payment
              provider rules.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">3. Acceptable use</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              You agree not to misuse the platform, submit fraudulent payments, abuse creators or
              supporters, or attempt unauthorized access to accounts, data, or services.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">4. Creator content and services</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Creators are responsible for the content, rewards, and communications they provide.
              Makulutu is not liable for creator-specific promises made outside this platform.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">5. Account and access</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We may suspend or terminate access for violations of these Terms, abuse, fraud, or
              actions that threaten platform integrity or user safety.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">6. Limitation of liability</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              The platform is provided on an &quot;as is&quot; basis. To the maximum extent allowed by law,
              Makulutu is not liable for indirect, incidental, or consequential damages arising from
              use of the service.
            </p>
          </article>

          <article>
            <h2 className="text-lg font-semibold text-white">7. Changes to these Terms</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We may update these Terms over time. Continued use after updates means you accept the
              revised Terms.
            </p>
          </article>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <span>Questions about these Terms?</span>
          <Link href="/support" className="font-semibold text-violet-300 hover:text-violet-200">
            Visit support
          </Link>
        </div>
      </main>
    </div>
  )
}
