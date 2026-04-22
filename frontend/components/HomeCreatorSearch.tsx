'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  effectiveCreatorSearchQuery,
  matchesCreatorSearch,
  type PublicCreator,
} from '@/lib/creator-search'

const SUGGESTION_LIMIT = 8

type HomeCreatorSearchProps = {
  creators: PublicCreator[]
  query: string
  onQueryChange: (value: string) => void
}

export function HomeCreatorSearch({ creators, query, onQueryChange }: HomeCreatorSearchProps) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const q = effectiveCreatorSearchQuery(query)

  const suggestions = useMemo(() => {
    const filtered = q ? creators.filter((c) => matchesCreatorSearch(c, q)) : creators
    return filtered.slice(0, SUGGESTION_LIMIT)
  }, [creators, q])

  useEffect(() => {
    if (!open) return
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const btn = buttonRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const w = Math.min(352, window.innerWidth - 32)
      let left = r.right - w
      left = Math.max(16, Math.min(left, window.innerWidth - w - 16))
      const top = r.bottom + 8
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width: w,
        zIndex: 200,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="rounded-xl border border-white/15 bg-[#12121a] p-3 shadow-2xl shadow-black/50 ring-1 ring-white/10"
      role="dialog"
      aria-label="Search creators"
    >
      <label htmlFor="home-creator-search-input" className="sr-only">
        Filter creators by name or handle
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="home-creator-search-input"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Name, @handle, category…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-white/15 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 outline-none ring-violet-500/30 focus:border-violet-400/50 focus:ring-2"
        />
      </div>

      <ul
        id={listId}
        className="mt-3 max-h-64 list-none space-y-1 overflow-y-auto p-0"
        role="listbox"
        aria-label="Creator suggestions"
      >
        {suggestions.length === 0 ? (
          <li className="rounded-lg px-3 py-6 text-center text-sm text-gray-400">No creators match.</li>
        ) : (
          suggestions.map((c) => (
            <li key={c.slug} role="presentation">
              <Link
                href={`/${c.slug}`}
                role="option"
                className="flex gap-3 rounded-lg px-2 py-2 transition hover:bg-white/[0.06]"
                onClick={() => setOpen(false)}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                      <Image
                        src={c.avatarUrl || '/logo.png'}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium text-white">{c.displayName}</span>
                  <span className="mt-0.5 block truncate text-xs text-gray-400">
                    @{c.slug}
                    {c.primaryCategory ? ` · ${c.primaryCategory}` : ''}
                  </span>
                  {c.bio?.trim() ? (
                    <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">
                      {c.bio.trim()}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null

  return (
    <div className="relative flex w-full justify-end">
      <button
        ref={buttonRef}
        type="button"
        className={`rounded-lg border p-2.5 text-white transition ${
          open
            ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
            : 'border-white/10 hover:bg-white/10'
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="h-5 w-5" aria-hidden />
        <span className="sr-only">Search creators</span>
      </button>

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
