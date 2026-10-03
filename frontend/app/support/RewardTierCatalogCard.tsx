'use client'

import type { CSSProperties, FormEvent } from 'react'
import { Gift, Loader2, Phone } from 'lucide-react'
import type { StreamAlertLimits, StreamAlertPlatform } from '@/lib/api'
import type { SupportCatalogRewardItem } from '@/lib/api'
import { darkenHex, mixHexWithWhite, normalizeRewardAccentHex, rgbaHex } from '@/lib/reward-tier-accent'
import { formatSupportPrice } from '@/lib/fx'
import { CheckoutCountryField } from '@/components/support/CheckoutCountryField'
import type { SupportCountryCode } from '@/lib/support-countries'

const PLATFORM_OPTIONS: { value: StreamAlertPlatform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'other', label: 'Other' },
]

export function RewardTierCatalogCard({
  tier,
  compact = false,
  streamLimits,
  expanded,
  tierForm,
  setTierForm,
  tierSubmitting,
  tierPaymentStatus,
  kenyaCheckout = true,
  country = 'KE',
  onCountryChange,
  tierError,
  onExpand,
  onCancel,
  onSubmit,
  labelCls,
  inputAmber,
}: {
  tier: SupportCatalogRewardItem
  /** Tighter layout when many tiers are shown in a grid */
  compact?: boolean
  streamLimits: StreamAlertLimits
  expanded: boolean
  tierForm: {
    displayName: string
    mpesaMobile: string
    email: string
    paymentMethod: 'mpesa' | 'paystack'
    platform: StreamAlertPlatform
    message: string
    videoUrl: string
  }
  setTierForm: React.Dispatch<
    React.SetStateAction<{
      displayName: string
      mpesaMobile: string
      email: string
      paymentMethod: 'mpesa' | 'paystack'
      platform: StreamAlertPlatform
      message: string
      videoUrl: string
    }>
  >
  tierSubmitting: boolean
  tierPaymentStatus: 'idle' | 'pending' | 'checking' | 'success' | 'failed'
  kenyaCheckout?: boolean
  country?: SupportCountryCode
  onCountryChange?: (code: SupportCountryCode) => void
  tierError: string | null
  onExpand: () => void
  onCancel: () => void
  onSubmit: (e: FormEvent) => void
  labelCls: string
  inputAmber: string
}) {
  const accent = normalizeRewardAccentHex(tier.accentColor)
  const pad = compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
  const cardShell = accent
    ? {
        className: `rounded-2xl border ${pad} shadow-xl`,
        style: {
          borderColor: rgbaHex(accent, 0.28),
          background: `linear-gradient(to bottom, ${rgbaHex(accent, 0.2)} 0%, rgba(13, 13, 20, 0.92) 42%, #0a0a0f 100%)`,
          boxShadow: `0 25px 50px -12px ${rgbaHex(accent, 0.18)}`,
        } as CSSProperties,
      }
    : {
        className: `rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-950/25 via-[#0d0d14]/90 to-[#0a0a0f] ${pad} shadow-xl shadow-amber-950/15`,
        style: undefined as CSSProperties | undefined,
      }

  const priceStyle = accent ? { color: mixHexWithWhite(accent, 0.38) } : undefined
  const bannerMutedStyle = accent ? { color: rgbaHex(accent, 0.72) } : undefined
  const bannerStrongStyle = accent ? { color: mixHexWithWhite(accent, 0.22) } : undefined

  const btnGradientStyle = accent
    ? {
        background: `linear-gradient(to right, ${accent}, ${darkenHex(accent, 0.58)})`,
      }
    : undefined

  const selectChevronDataUrl = (strokeHex: string) => {
    const enc = encodeURIComponent(strokeHex)
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${enc}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`
  }

  /** Inputs/selects/textareas: match tier accent borders + focus ring when `accent` is set. */
  const tierFieldClass = accent
    ? 'mt-1.5 w-full rounded-xl border bg-[color:var(--tier-field-bg)] px-4 py-3 text-white placeholder:text-gray-500 transition focus:outline-none focus:ring-1 border-[color:var(--tier-field-border)] focus:border-[color:var(--tier-field-border-focus)] focus:ring-[color:var(--tier-field-ring)]'
    : inputAmber

  const tierSelectClass = `${tierFieldClass} cursor-pointer appearance-none pr-10`

  const tierFormAccentStyle: CSSProperties | undefined = accent
    ? {
        ['--tier-field-bg' as string]: rgbaHex(accent, 0.08),
        ['--tier-field-border' as string]: rgbaHex(accent, 0.32),
        ['--tier-field-border-focus' as string]: rgbaHex(accent, 0.58),
        ['--tier-field-ring' as string]: rgbaHex(accent, 0.42),
      }
    : undefined

  return (
    <div className={cardShell.className} style={cardShell.style}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
        <h2
          className={`font-bold text-white ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}
        >
          {tier.name}
        </h2>
        <span
          className={`font-bold tabular-nums ${compact ? 'text-lg' : 'text-xl'} ${accent ? '' : 'text-amber-200'}`}
          style={priceStyle}
        >
          {formatSupportPrice(tier.amountKes, kenyaCheckout)}
        </span>
      </div>
      {onCountryChange ? (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <CheckoutCountryField
            id={`tier-country-${tier.id}`}
            value={country}
            onChange={onCountryChange}
            compactHint
            selectClassName={tierSelectClass}
          />
        </div>
      ) : null}
      {tier.description ? (
        <p
          className={`text-sm leading-relaxed text-gray-400 ${compact ? 'line-clamp-3' : ''}`}
          title={compact ? tier.description : undefined}
        >
          {tier.description}
        </p>
      ) : null}
      <p
        className={`${compact ? 'mt-1.5' : 'mt-2'} text-xs ${accent ? '' : 'text-amber-200/70'}`}
        style={bannerMutedStyle}
      >
        Banner:{' '}
        <span
          className={`font-medium ${accent ? '' : 'text-amber-100/90'}`}
          style={bannerStrongStyle}
        >
          {tier.alertBannerLabel}
        </span>
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={onExpand}
          className={
            accent
              ? 'mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110'
              : 'mt-5 w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-amber-500 hover:to-orange-500'
          }
          style={btnGradientStyle}
        >
          Get this tier
        </button>
      ) : (
        <form className="mt-5 space-y-4" style={tierFormAccentStyle} onSubmit={onSubmit}>
          <div>
            <label
              className={labelCls}
              htmlFor={`tier-platform-${tier.id}`}
              style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}
            >
              Platform
            </label>
            <select
              id={`tier-platform-${tier.id}`}
              value={tierForm.platform}
              onChange={(e) =>
                setTierForm((f) => ({
                  ...f,
                  platform: e.target.value as StreamAlertPlatform,
                }))
              }
              className={tierSelectClass}
              style={{
                backgroundImage: selectChevronDataUrl(accent || '#fbbf24'),
                backgroundSize: '1rem',
                backgroundPosition: 'right 0.75rem center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={labelCls}
              htmlFor={`tier-name-${tier.id}`}
              style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}
            >
              Name on stream
            </label>
            <input
              id={`tier-name-${tier.id}`}
              type="text"
              value={tierForm.displayName}
              onChange={(e) => setTierForm((f) => ({ ...f, displayName: e.target.value }))}
              maxLength={64}
              className={tierFieldClass}
              placeholder="@yourhandle or display name"
            />
          </div>

          <div>
            <span
              className={labelCls}
              id={`tier-pay-${tier.id}`}
              style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}
            >
              Payment method
            </span>
            <div className="mt-2 flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
              {kenyaCheckout ? (
              <button
                type="button"
                onClick={() => setTierForm((f) => ({ ...f, paymentMethod: 'mpesa' }))}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tierForm.paymentMethod === 'mpesa'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                M-Pesa
              </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTierForm((f) => ({ ...f, paymentMethod: 'paystack' }))}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tierForm.paymentMethod === 'paystack'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                Card
              </button>
            </div>
          </div>

          {tierForm.paymentMethod === 'mpesa' ? (
          <div>
            <label
              className={labelCls}
              htmlFor={`tier-mpesa-${tier.id}`}
              style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}
            >
              M-Pesa number
            </label>
            <input
              id={`tier-mpesa-${tier.id}`}
              type="tel"
              inputMode="numeric"
              value={tierForm.mpesaMobile}
              onChange={(e) => setTierForm((f) => ({ ...f, mpesaMobile: e.target.value }))}
              className={tierFieldClass}
              placeholder="2547XXXXXXXX or 07XXXXXXXX"
            />
          </div>
          ) : (
          <div>
            <label
              className={labelCls}
              htmlFor={`tier-email-${tier.id}`}
              style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}
            >
              Email
            </label>
            <input
              id={`tier-email-${tier.id}`}
              type="email"
              value={tierForm.email}
              onChange={(e) => setTierForm((f) => ({ ...f, email: e.target.value }))}
              className={tierFieldClass}
              placeholder="you@email.com"
            />
          </div>
          )}

          {tier.allowSupporterMessage ? (
            <div>
              <label className={labelCls} htmlFor={`tier-msg-${tier.id}`}>
                <span style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}>
                  Message{' '}
                </span>
                <span
                  className="font-normal text-gray-500"
                  style={accent ? { color: rgbaHex(accent, 0.55) } : undefined}
                >
                  (optional, max {tier.maxMessageLength})
                </span>
              </label>
              <textarea
                id={`tier-msg-${tier.id}`}
                value={tierForm.message}
                onChange={(e) => setTierForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                maxLength={tier.maxMessageLength}
                className={`${tierFieldClass} min-h-[4.5rem] resize-y`}
                placeholder="What should the coach say?"
              />
            </div>
          ) : null}

          {tier.allowVideoClip ? (
            <div>
              <label className={labelCls} htmlFor={`tier-clip-${tier.id}`}>
                <span style={accent ? { color: mixHexWithWhite(accent, 0.55) } : undefined}>
                  Clip URL{' '}
                </span>
                <span
                  className="font-normal text-gray-500"
                  style={accent ? { color: rgbaHex(accent, 0.55) } : undefined}
                >
                  (optional)
                </span>
              </label>
              <input
                id={`tier-clip-${tier.id}`}
                type="url"
                inputMode="url"
                value={tierForm.videoUrl}
                onChange={(e) => setTierForm((f) => ({ ...f, videoUrl: e.target.value }))}
                className={tierFieldClass}
                placeholder="https://www.tiktok.com/…"
              />
              {tier.amountKes < streamLimits.minKesWithVideo ? (
                <p
                  className={`mt-1.5 text-xs ${accent ? '' : 'text-amber-200/80'}`}
                  style={accent ? { color: rgbaHex(accent, 0.82) } : undefined}
                >
                  This tier is below the minimum for clips ({formatSupportPrice(streamLimits.minKesWithVideo, kenyaCheckout)}). Leave the URL empty
                  or pick another tier.
                </p>
              ) : null}
            </div>
          ) : null}

          {tierError && tierPaymentStatus === 'failed' ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-200">{tierError}</p>
            </div>
          ) : null}

          {tierPaymentStatus === 'checking' ? (
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                accent ? '' : 'border-amber-500/35 bg-amber-950/25'
              }`}
              style={
                accent
                  ? {
                      borderColor: rgbaHex(accent, 0.35),
                      backgroundColor: rgbaHex(accent, 0.08),
                    }
                  : undefined
              }
            >
              <Loader2
                className={`h-5 w-5 shrink-0 animate-spin ${accent ? '' : 'text-amber-400'}`}
                style={accent ? { color: mixHexWithWhite(accent, 0.25) } : undefined}
              />
              <p
                className={`text-sm ${accent ? '' : 'text-amber-100'}`}
                style={accent ? { color: mixHexWithWhite(accent, 0.2) } : undefined}
              >
                Waiting for M-Pesa…
              </p>
            </div>
          ) : null}

          {tierPaymentStatus === 'pending' ? (
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                accent ? '' : 'border-amber-500/35 bg-amber-950/20'
              }`}
              style={
                accent
                  ? {
                      borderColor: rgbaHex(accent, 0.32),
                      backgroundColor: rgbaHex(accent, 0.06),
                    }
                  : undefined
              }
            >
              <Phone
                className={`h-5 w-5 shrink-0 ${accent ? '' : 'text-amber-400'}`}
                style={accent ? { color: mixHexWithWhite(accent, 0.28) } : undefined}
              />
              <p
                className={`text-sm ${accent ? '' : 'text-amber-100'}`}
                style={accent ? { color: mixHexWithWhite(accent, 0.2) } : undefined}
              >
                Complete the STK prompt on your phone.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCancel}
              className="order-2 w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 sm:order-1 sm:w-auto sm:min-w-[7rem]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                tierSubmitting ||
                tierPaymentStatus === 'checking' ||
                (tier.allowVideoClip &&
                  !!tierForm.videoUrl.trim() &&
                  tier.amountKes < streamLimits.minKesWithVideo)
              }
              className={
                accent
                  ? 'order-1 flex w-full flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 sm:order-2'
                  : 'order-1 flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-amber-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-45 sm:order-2'
              }
              style={btnGradientStyle}
            >
              {tierSubmitting || tierPaymentStatus === 'checking' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" />
                  Pay {formatSupportPrice(tier.amountKes, kenyaCheckout)}
                  {tierForm.paymentMethod === 'paystack' ? ' with card' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
