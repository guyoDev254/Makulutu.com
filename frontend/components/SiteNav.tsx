'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/book', label: 'Book' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="container mx-auto max-w-7xl px-4 py-4 sm:py-6 relative z-30">
      <div className="flex justify-between items-center gap-4">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-bold text-white shrink-0 min-w-0 truncate"
          onClick={() => setOpen(false)}
        >
          MohaGamer
        </Link>
        <button
          type="button"
          className="md:hidden p-2.5 rounded-lg text-white hover:bg-white/10 border border-white/10"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div
          className={`${
            open ? 'flex' : 'hidden'
          } md:flex flex-col md:flex-row md:items-center gap-1 md:gap-6 absolute md:static left-0 right-0 top-[calc(100%+0.5rem)] md:top-auto rounded-xl md:rounded-none border border-gray-700/80 md:border-0 bg-gray-950/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none shadow-xl md:shadow-none p-4 md:p-0`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-white hover:text-purple-300 py-3 md:py-0 px-2 md:px-0 rounded-lg md:rounded-none hover:bg-white/5 md:hover:bg-transparent text-base font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/subscribe"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 md:py-2 rounded-lg text-center font-semibold mt-1 md:mt-0"
            onClick={() => setOpen(false)}
          >
            Subscribe
          </Link>
        </div>
      </div>
    </nav>
  )
}
