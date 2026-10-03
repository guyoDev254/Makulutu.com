import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SITE_NAME } from '@/lib/site-brand'

const LAST_UPDATED = '2 October 2026'

const DEFAULT_PLATFORM_FEE_PERCENT = 5
const DEFAULT_SETTLEMENT_HOURS = 24
const DEFAULT_MIN_WITHDRAWAL_KES = 500
const DEFAULT_WITHDRAWAL_FEE_KES = 0

export const metadata: Metadata = {
  title: `Terms of Service · ${SITE_NAME}`,
  description: `Fees, commissions, payouts, refunds, and rules for fans and streamers on ${SITE_NAME}.`,
}

const toc = [
  { href: '#agreement', label: '1. Agreement' },
  { href: '#platform', label: '2. The platform' },
  { href: '#eligibility', label: '3. Eligibility' },
  { href: '#accounts', label: '4. Accounts' },
  { href: '#catalog', label: '5. Memberships and catalog' },
  { href: '#commissions', label: '6. Fees and commissions' },
  { href: '#payouts', label: '7. Wallet and payouts' },
  { href: '#payments', label: '8. Paying on Makulutu' },
  { href: '#refunds', label: '9. Refunds and chargebacks' },
  { href: '#content', label: '10. Content and streams' },
  { href: '#acceptable-use', label: '11. Acceptable use' },
  { href: '#ip', label: '12. Intellectual property' },
  { href: '#privacy', label: '13. Privacy' },
  { href: '#liability', label: '14. Liability' },
  { href: '#law', label: '15. Law and contact' },
]

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-lg font-semibold text-white">
      {children}
    </h2>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-300">{children}</p>
}

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-300">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white">
      <SiteNav showBook={false} />
      <main className="container mx-auto max-w-4xl px-4 pb-16 pt-6 sm:pb-24 sm:pt-10">
        <header className="surface-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-sm leading-relaxed text-gray-300">
            These Terms govern your use of {SITE_NAME} as a fan, streamer (creator), or visitor —
            including the website, APIs, and mobile app. By creating an account, checking out, or
            using the service, you agree to these Terms.
          </p>
        </header>

        <nav
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8"
          aria-label="On this page"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contents</p>
          <ol className="mt-3 columns-1 gap-x-8 text-sm text-violet-200/90 sm:columns-2">
            {toc.map((item) => (
              <li key={item.href} className="break-inside-avoid py-0.5">
                <a href={item.href} className="hover:text-white">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section className="mt-8 space-y-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <article>
            <H2 id="agreement">1. Agreement</H2>
            <P>
              {SITE_NAME} is a Kenya-focused platform for live streamers and the fans who support
              them. References to “we”, “us”, and “the platform” mean {SITE_NAME}. “You” means the
              person using the service. If you use {SITE_NAME} on behalf of an organisation, you
              confirm you have authority to bind that organisation.
            </P>
            <P>
              We may update these Terms. The “Last updated” date above is the current version.
              Continued use after a change means you accept the revised Terms. Material fee changes
              are described in section 6.
            </P>
          </article>

          <article>
            <H2 id="platform">2. The platform</H2>
            <P>
              {SITE_NAME} provides tools so streamers can publish a public page and receive support,
              and so fans can pay for:
            </P>
            <Ul
              items={[
                'Memberships (subscriptions) to a streamer’s page',
                'One-time live shoutouts shown on the stream (OBS / overlay alerts)',
                'Reward tiers the streamer lists',
                'Optional coaching or booking extras a streamer chooses to sell',
              ]}
            />
            <P>
              We facilitate checkout, wallets, payouts, and related notifications. We do not
              produce the streamer’s live content, guarantee they will go live, or operate TikTok,
              YouTube, Twitch, Kick, or other sites they stream on. We are not a bank, M-Pesa
              agent, or payment institution; money movement uses third-party processors.
            </P>
          </article>

          <article>
            <H2 id="eligibility">3. Eligibility</H2>
            <P>
              You must be at least 18 years old and legally able to enter a contract in Kenya (or
              in your country of residence) to create an account or complete a payment. You must
              use a valid Kenyan mobile number where M-Pesa is required, and accurate identity and
              contact details. We may refuse, suspend, or close accounts that fail verification,
              look fraudulent, or violate these Terms.
            </P>
          </article>

          <article>
            <H2 id="accounts">4. Accounts</H2>
            <P>
              Streamers and fans may register with email and password, a one-time code, or Google
              sign-in where that option is shown. You are responsible for keeping login details
              secret and for activity on your account. Streamers must complete email verification
              where required, keep their public profile honest, and may need stream verification
              before we treat the channel as reviewed.
            </P>
            <P>
              We may suspend or terminate access for fraud, abuse, unpaid chargebacks, illegal
              content, or risk to users or the platform. You may stop using the service at any
              time; closing an account does not cancel completed payments or erase records we must
              keep for finance, tax, or dispute handling.
            </P>
          </article>

          <article>
            <H2 id="catalog">5. Memberships and catalog</H2>
            <P>
              Each streamer sets (or inherits) prices in Kenyan shillings (KES) for membership,
              shoutouts, reward tiers, and optional extras. Fans outside Kenya may see those
              amounts in US dollars at checkout as a convenience; the listed KES price and the
              amount billed on card (Paystack) remain in KES. What you receive — member chat or
              WhatsApp access, shoutouts on a live, a reward, or a coaching follow-up — is a
              promise between you and that streamer. {SITE_NAME} does not guarantee delivery,
              quality, or schedule of those benefits.
            </P>
            <P>
              Membership is billed for the period shown at checkout (for example monthly). It is
              not a school enrolment. Shoutouts and reward tiers are typically one-off payments,
              not subscriptions, unless the checkout clearly says otherwise.
            </P>
          </article>

          <article>
            <H2 id="commissions">6. Fees and commissions</H2>
            <P>
              When a fan payment completes, {SITE_NAME} takes a <strong>platform commission</strong>{' '}
              from the gross KES amount the fan paid for that transaction. The remainder is the
              streamer’s net earning for that payment.
            </P>
            <P>
              <strong>Default commission:</strong> {DEFAULT_PLATFORM_FEE_PERCENT}% of each completed
              payment. Super Admin may set a different rate between 0% and 100%. The rate in force
              when the payment completes is stored on that payment and used for the split. Streamers
              can see the current rate in their wallet.
            </P>
            <P>
              The fee is calculated <strong>per payment</strong>, not as one bulk charge on a
              month’s total: commission = round(gross × rate ÷ 100) to the nearest cent (two
              decimal places in KES), then net = gross − commission.
            </P>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[480px] text-left text-sm">
                <caption className="sr-only">
                  Example split at the default {DEFAULT_PLATFORM_FEE_PERCENT}% commission
                </caption>
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Example (default {DEFAULT_PLATFORM_FEE_PERCENT}%)</th>
                    <th className="px-3 py-2 font-semibold text-right">Gross</th>
                    <th className="px-3 py-2 font-semibold text-right">Platform</th>
                    <th className="px-3 py-2 font-semibold text-right">Streamer net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-gray-300">
                  <tr>
                    <td className="px-3 py-2">Membership or shoutout of KES 1,000</td>
                    <td className="px-3 py-2 text-right tabular-nums">1,000.00</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-200/90">50.00</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-200/90">950.00</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Reward tier of KES 200</td>
                    <td className="px-3 py-2 text-right tabular-nums">200.00</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-200/90">10.00</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-200/90">190.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              This commission applies to completed memberships, live shoutouts, reward tiers, and
              coaching bookings processed through {SITE_NAME}. It is {SITE_NAME}’s fee for
              providing the platform. It is separate from:
            </P>
            <Ul
              items={[
                'Safaricom M-Pesa, PayPal, or other processor charges under their own terms',
                'Any withdrawal / payout fee we configure (default KES ' +
                  DEFAULT_WITHDRAWAL_FEE_KES +
                  ' unless shown otherwise in the streamer wallet)',
                'Taxes the streamer or fan must account for under Kenyan or other law',
              ]}
            />
            <P>
              Listed checkout prices are the amounts fans pay in KES on the platform. We do not
              add a second “hidden” platform percentage on top of that listed price at checkout;
              the commission is taken from the completed amount before the streamer’s wallet is
              credited.
            </P>
          </article>

          <article>
            <H2 id="payouts">7. Wallet and payouts</H2>
            <P>
              After a payment completes, the streamer’s net share is held as pending earnings for a
              settlement period (default {DEFAULT_SETTLEMENT_HOURS} hours, configurable by Super
              Admin). After that, the amount can be requested as a withdrawal, subject to a minimum
              (default KES {DEFAULT_MIN_WITHDRAWAL_KES.toLocaleString('en-KE')}).
            </P>
            <P>
              Streamers choose a Kenyan M-Pesa number or a Kenyan bank account. When you request a
              withdrawal, Paystack sends the net amount there automatically — no admin approval
              step. Timing depends on Paystack, M-Pesa or bank rails, and on correct destination
              details. We may pause payouts for suspected fraud, missing KYC, or outstanding
              refunds.
            </P>
            <P>
              You must not treat pending or available wallet balances as a deposit account. Balances
              are records of amounts we intend to pay you after fees, settlements, and any
              reversals.
            </P>
          </article>

          <article>
            <H2 id="payments">8. Paying on Makulutu</H2>
            <P>
              Kenya fans typically pay in KES with M-Pesa. Other countries see USD labels and pay
              by card (Paystack still bills in KES) or PayPal in USD where enabled. You authorise
              the charge when you confirm checkout. Failed,
              cancelled, or expired prompts are not completed payments; no membership or shoutout
              is due until the processor confirms success.
            </P>
            <P>
              Guest checkout may collect a name and M-Pesa number without a fan account. Logged-in
              fans may also pay from the app or web. You must only use a number and payment
              instrument you are allowed to use.
            </P>
          </article>

          <article>
            <H2 id="refunds">9. Refunds and chargebacks</H2>
            <P>
              Digital support (memberships, shoutouts, reward tiers) is generally non-refundable
              once the payment has completed, except where we or the payment provider are required
              by law to refund, or we reverse a payment for fraud, duplicate charge, or a processor
              error.
            </P>
            <P>
              Streamers are responsible for honouring what they sold. If a fan disputes a charge
              with M-Pesa, PayPal, their bank, or us, we may refund through the original channel and
              deduct or claw back the related net amount from the streamer’s wallet — including
              amounts already marked available. Processor dispute fees may be passed through where
              they apply.
            </P>
            <P>
              Coaching or booking extras that the streamer fails to deliver should be raised first
              with that streamer, then via{' '}
              <Link href="/support" className="font-medium text-violet-300 hover:text-violet-200">
                Support
              </Link>
              . We may assist but are not obliged to complete the session ourselves.
            </P>
          </article>

          <article>
            <H2 id="content">10. Content and streams</H2>
            <P>
              Streamers own (or must have rights to) the profile, photos, overlay messages, and
              live content they publish. You grant {SITE_NAME} a worldwide, non-exclusive licence to
              host, display, and transmit that material as needed to run the service (public pages,
              alerts, emails, and app screens).
            </P>
            <P>
              Fans grant the same licence for names, messages, clip URLs, and media they submit for
              shoutouts or rewards. Do not submit content you do not have the right to share.
              Streamers must not use member WhatsApp or contact details for spam or unrelated
              marketing without a lawful basis.
            </P>
          </article>

          <article>
            <H2 id="acceptable-use">11. Acceptable use</H2>
            <P>You agree not to:</P>
            <Ul
              items={[
                'Make fraudulent payments, stolen-SIM / unauthorised M-Pesa use, or chargeback abuse',
                'Harass streamers or fans, or post illegal, hateful, or sexually exploitative content — including any sexual content involving minors',
                'Impersonate another person or streamer, or scrape, attack, or probe the service',
                'Circumvent fees, verification, or payout controls',
                'Use the platform for money laundering or any crime',
              ]}
            />
            <P>
              We may remove content, withhold payouts, and report activity to payment partners or
              authorities where we reasonably believe the law requires it.
            </P>
          </article>

          <article>
            <H2 id="ip">12. Intellectual property</H2>
            <P>
              The {SITE_NAME} name, logo, software, and site design are ours or our licensors’. You
              may not copy the platform or use our marks except as needed to identify a genuine{' '}
              {SITE_NAME} page. Feedback you send may be used to improve the service without
              obligation to you.
            </P>
          </article>

          <article>
            <H2 id="privacy">13. Privacy</H2>
            <P>
              We process personal data to operate accounts, checkout, fraud prevention, payouts, and
              support. That typically includes name, email, phone / M-Pesa MSISDN, profile photos,
              payment references, device and log data, and messages you send through the product.
              Media you upload may be stored in private object storage and shown via time-limited
              access links.
            </P>
            <P>
              We share data with payment processors, email/SMS/WhatsApp providers, hosting (including
              AWS where used), and as required by law. We retain finance records as needed for
              accounting and disputes. You may request access or correction of your account data via
              Support. Kenya’s Data Protection Act, 2019 applies to processing we carry out in
              connection with this service.
            </P>
          </article>

          <article>
            <H2 id="liability">14. Disclaimers and liability</H2>
            <P>
              The service is provided “as is”. Live platforms, M-Pesa, PayPal, hosting, and the
              internet can fail. We do not warrant uninterrupted uptime, that a streamer will
              perform, or that a shoutout will appear on a particular broadcast.
            </P>
            <P>
              To the maximum extent allowed by Kenyan law, {SITE_NAME} is not liable for indirect,
              incidental, special, or consequential loss, lost profits, or lost data. Our total
              liability for a claim relating to a payment is limited to the platform commission we
              actually retained on that payment, and for other claims to KES 5,000 in aggregate,
              except where liability cannot be limited (including death or personal injury caused by
              negligence, or fraud).
            </P>
            <P>
              You will indemnify {SITE_NAME} against claims arising from your content, your breach
              of these Terms, or your disputes with fans or streamers, except to the extent caused
              by our wilful misconduct.
            </P>
          </article>

          <article>
            <H2 id="law">15. Governing law and contact</H2>
            <P>
              These Terms are governed by the laws of the Republic of Kenya. Courts of competent
              jurisdiction in Kenya have exclusive jurisdiction, after you first try to resolve the
              issue with us in good faith.
            </P>
            <P>
              Questions:{' '}
              <Link href="/support" className="font-semibold text-violet-300 hover:text-violet-200">
                Support
              </Link>
              {' · '}
              <Link href="/about" className="font-semibold text-violet-300 hover:text-violet-200">
                About {SITE_NAME}
              </Link>
              .
            </P>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
