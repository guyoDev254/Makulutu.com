'use client'

import Image from 'next/image'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { SITE_BRAND_ALT } from '@/lib/site-brand'

export const authLabelClass = 'mb-2 block text-sm font-medium text-zinc-300'

export const authInputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500'

export const authInputPlainClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500'

export const authSubmitClass =
  'btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50'

export function AuthPasswordInput({
  showLock = true,
  className,
  ...props
}: {
  showLock?: boolean
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  const [visible, setVisible] = useState(false)
  const inputClass =
    className ||
    (showLock
      ? `${authInputClass} pr-12`
      : 'w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-purple-500')

  return (
    <div className="relative">
      {showLock ? (
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      ) : null}
      <input {...props} type={visible ? 'text' : 'password'} className={inputClass} />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 transition hover:text-white"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

export function AuthLoginShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  logoSize = 'lg',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'md' | 'lg'
  logoSize?: 'lg' | 'md'
}) {
  const maxClass = maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md'
  const logoWrap =
    logoSize === 'lg' ? 'h-32 w-32 sm:h-36 sm:w-36' : 'h-28 w-28 sm:h-32 sm:w-32'

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10 sm:py-12">
      <div className={`w-full ${maxClass} min-w-0`}>
        <div className="surface-card p-5 shadow-glow backdrop-blur-lg sm:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <div className="mb-4 flex justify-center sm:mb-5">
              <span
                className={`inline-flex ${logoWrap} shrink-0 overflow-hidden rounded-full bg-transparent p-0`}
              >
                <Image
                  src="/makulutu-logo.png"
                  alt={SITE_BRAND_ALT}
                  width={256}
                  height={256}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            {subtitle ? <p className="text-zinc-400">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
