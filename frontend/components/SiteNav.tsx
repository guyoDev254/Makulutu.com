'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { PlatformBrand } from '@/components/PlatformBrand'
import { getFanToken } from '@/lib/fan-auth'

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
  const [fanSignedIn, setFanSignedIn] = useState(false)
  useEffect(() => {
    setFanSignedIn(Boolean(getFanToken()))
  }, [])
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
      } md:flex flex-col md:flex-row md:items-center gap-1 md:gap-1 absolute md:static left-3 right-3 top-[calc(100%+0.35rem)] md:top-auto z-20 rounded-2xl md:rounded-none border border-white/10 md:border-0 bg-[#12121a]/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none shadow-2xl md:shadow-none p-3 md:p-0`}
    >
      {navLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-zinc-200 hover:text-white py-2.5 md:py-2 px-3 rounded-xl text-sm font-medium transition hover:bg-white/5"
          onClick={() => setOpen(false)}
        >
          {l.label}
        </Link>
      ))}
      {showAuthButtons ? (
        <>
          {/* {fanSignedIn ? (
            <Link
              href="/fan/account"
              className="btn-secondary mt-1 md:mt-0 md:min-h-0 md:py-2 md:px-3"
              onClick={() => setOpen(false)}
            >
              Fan account
            </Link>
          ) : (
            <Link
              href="/fan/login"
              className="btn-secondary mt-1 md:mt-0 md:min-h-0 md:py-2 md:px-3"
              onClick={() => setOpen(false)}
            >
              Fan login
            </Link>
          )} */}
          <Link
            href="/creator/login"
            className="btn-secondary mt-1 md:mt-0 md:min-h-0 md:py-2 md:px-3"
            onClick={() => setOpen(false)}
          >
            Streamer login
          </Link>
          <Link
            href="/creator/signup"
            className="btn-primary mt-1 md:mt-0 md:min-h-0 md:py-2 md:px-4"
            onClick={() => setOpen(false)}
          >
            Get started
          </Link>
        </>
      ) : null}
      {showSupport ? (
        <Link
          href={slug ? `/support/${slug}` : '/support'}
          className="btn-primary mt-1 md:mt-0 md:min-h-0 md:py-2 md:px-4"
          onClick={() => setOpen(false)}
        >
          Support
        </Link>
      ) : null}
    </div>
  )

  const chrome = 'sticky top-0 z-40 border-b border-white/5 bg-[#07070c]/75 backdrop-blur-xl'

  if (creatorSearchSlot) {
    return (
      <nav className={chrome}>
        <div className="container relative mx-auto max-w-7xl px-4 py-3 sm:py-4">
          <div className="grid w-full grid-cols-[1fr_auto_auto] gap-x-2 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-x-4">
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
              className="col-start-2 row-start-1 self-center rounded-xl border border-white/10 p-2.5 text-white hover:bg-white/10 md:hidden"
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
        </div>
      </nav>
    )
  }

  return (
    <nav className={chrome}>
      <div className="container relative mx-auto max-w-7xl px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <PlatformBrand
            href="/"
            variant="nav"
            priority
            onClick={() => setOpen(false)}
          />
          <button
            type="button"
            className="rounded-xl border border-white/10 p-2.5 text-white hover:bg-white/10 md:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          {navPanel}
        </div>
      </div>
    </nav>
  )
}
