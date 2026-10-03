import Link from 'next/link'
import { PlatformBrand } from '@/components/PlatformBrand'
import { SITE_NAME, SITE_NAME_CLASS, SITE_TAGLINE } from '@/lib/site-brand'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/20">
      <div className="container mx-auto max-w-7xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:text-left text-center">
          <PlatformBrand href="/" variant="footer" description={SITE_TAGLINE} />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-400">
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
            <Link href="/book" className="transition hover:text-white">
              Book
            </Link>
            <Link href="/creator/login" className="transition hover:text-white">
              Streamer login
            </Link>
            {/* <Link href="/fan/login" className="transition hover:text-white">
              Fan login
            </Link> */}
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-600 sm:text-left">
          © {new Date().getFullYear()} <span className={SITE_NAME_CLASS}>{SITE_NAME}</span>
        </p>
      </div>
    </footer>
  )
}
