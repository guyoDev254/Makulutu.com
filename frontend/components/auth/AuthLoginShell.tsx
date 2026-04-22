'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import { SITE_BRAND_ALT } from '@/lib/site-brand'

export const authLabelClass = 'block text-sm font-medium text-gray-300 mb-2'

export const authInputClass =
  'w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'

export const authInputPlainClass =
  'w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'

export const authSubmitClass =
  'w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

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
    <div className="min-h-dvh bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4 py-10 sm:py-12">
      <div className={`w-full ${maxClass} min-w-0`}>
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4 sm:mb-5">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
            {subtitle ? <p className="text-gray-400">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
