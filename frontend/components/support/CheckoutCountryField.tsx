'use client'

import { ChevronDown } from 'lucide-react'
import {
  SUPPORT_COUNTRIES,
  isKenyaCheckout,
  parseSupportCountryCode,
  type SupportCountryCode,
} from '@/lib/support-countries'

const DEFAULT_SELECT =
  'w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-10 text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40'

export function CheckoutCountryField({
  id,
  value,
  onChange,
  selectClassName,
  compactHint = false,
}: {
  id: string
  value: SupportCountryCode
  onChange: (code: SupportCountryCode) => void
  selectClassName?: string
  compactHint?: boolean
}) {
  const kenya = isKenyaCheckout(value)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300" htmlFor={id}>
        Your country
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(parseSupportCountryCode(e.target.value))}
          className={`${selectClassName || DEFAULT_SELECT} mt-0 bg-none`}
        >
          {SUPPORT_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>
      <p className={`mt-1.5 text-xs text-gray-500 ${compactHint ? 'line-clamp-2' : ''}`}>
        {kenya
          ? 'Kenya: pay in KES with M-Pesa, card, or PayPal.'
          : 'Prices in USD. Card is billed in KES (~130 KES / $1).'}
      </p>
    </div>
  )
}
