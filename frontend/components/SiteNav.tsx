'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { PlatformBrand } from '@/components/PlatformBrand'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/book', label: 'Book' },
]

export function SiteNav({
  showSupport = true,
  showBook = true,
  showAuthButtons = false,
  creatorSlug,
  creatorSearchSlot,
}: {
  showSupport?: boolean
  showBook?: boolean
  showAuthButtons?: boolean
  /** When set, Support/Book point at this creator (not global routes). */
  creatorSlug?: string
  /** e.g. home page creator directory search */
  creatorSearchSlot?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const slug = creatorSlug?.trim() || ''
  const navLinks = slug
    ? [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
        { href: `/support/${slug}`, label: 'Support' },
        { href: `/book/${slug}`, label: 'Book' },
      ]
    : showBook
      ? links
      : links.filter((l) => l.href !== '/book')

  const navPanel = (
    <div
      className={`${
        open ? 'flex' : 'hidden'
      } md:flex flex-col md:flex-row md:items-center gap-1 md:gap-6 absolute md:static left-0 right-0 top-[calc(100%+0.5rem)] md:top-auto z-20 rounded-xl md:rounded-none border border-gray-700/80 md:border-0 bg-gray-950/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none shadow-xl md:shadow-none p-4 md:p-0`}
    >
      {navLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-white hover:text-purple-300 py-3 md:py-0 px-2 md:px-0 rounded-lg md:rounded-none hover:bg-white/5 md:hover:bg-transparent text-base font-medium"
          onClick={() => setOpen(false)}
        >
          {l.label}
        </Link>
      ))}
      {showAuthButtons ? (
        <>
          <Link
            href="/creator/login"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 md:py-2 text-center font-semibold text-white/90 hover:bg-white/10 mt-1 md:mt-0"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/creator/signup"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 md:py-2 rounded-lg text-center font-semibold mt-1 md:mt-0"
            onClick={() => setOpen(false)}
          >
            Get started
          </Link>
        </>
      ) : null}
      {showSupport ? (
        <Link
          href="/support"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 md:py-2 rounded-lg text-center font-semibold mt-1 md:mt-0"
          onClick={() => setOpen(false)}
        >
          Support
        </Link>
      ) : null}
    </div>
  )

  if (creatorSearchSlot) {
    return (
      <nav className="container relative z-30 mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <div className="grid w-full grid-cols-[1fr_auto_auto] gap-x-2 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-4 md:items-center">
          <div className="col-start-1 row-start-1 min-w-0 self-center">
            <PlatformBrand
              href="/"
              variant="nav"
              priority
              onClick={() => setOpen(false)}
            />
          </div>
          <button
            type="button"
            className="col-start-2 row-start-1 self-center rounded-lg border border-white/10 p-2.5 text-white hover:bg-white/10 md:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="col-start-3 row-start-1 min-w-0 self-center justify-self-end md:col-start-3">
            {creatorSearchSlot}
          </div>
          <div className="relative col-span-3 min-h-0 md:col-span-1 md:col-start-2 md:row-start-1 md:flex md:justify-end">
            {navPanel}
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="container relative z-30 mx-auto max-w-7xl px-4 py-5 sm:py-6">
      <div className="flex items-center justify-between gap-4">
        <PlatformBrand
          href="/"
          variant="nav"
          priority
          onClick={() => setOpen(false)}
        />
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2.5 text-white hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        {navPanel}
      </div>
    </nav>
  )
}
