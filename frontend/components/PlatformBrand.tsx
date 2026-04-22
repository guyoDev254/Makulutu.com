import Image from 'next/image'
import Link from 'next/link'
import { SITE_BRAND_ALT, SITE_NAME, SITE_NAME_CLASS } from '@/lib/site-brand'

export type PlatformBrandProps = {
  /** Use `null` for a non-clickable brand row */
  href?: string | null
  priority?: boolean
  variant?: 'nav' | 'footer'
  /** Line under the wordmark (typical footer tagline) */
  description?: string
  onClick?: () => void
}

export function PlatformBrand({
  href = '/',
  priority = false,
  variant = 'nav',
  description,
  onClick,
}: PlatformBrandProps) {
  const imgWrapCls =
    variant === 'nav'
      ? 'h-16 w-16 sm:h-20 sm:w-20 md:h-[5.25rem] md:w-[5.25rem] shrink-0 overflow-hidden rounded-full bg-transparent p-0'
      : 'h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full bg-transparent p-0'

  const imgClass = 'h-full w-full object-contain'

  const titleCls =
    variant === 'nav'
      ? `${SITE_NAME_CLASS} text-2xl sm:text-3xl text-white truncate group-hover:text-violet-100 transition-colors leading-tight`
      : `${SITE_NAME_CLASS} text-xl sm:text-2xl text-white leading-tight`

  const body = (
    <>
      <span className={imgWrapCls}>
        <Image
          src="/makulutu-logo.png"
          alt={SITE_BRAND_ALT}
          width={256}
          height={256}
          className={imgClass}
          priority={priority}
        />
      </span>
      <div className={`min-w-0 ${variant === 'footer' ? 'text-center sm:text-left' : ''}`}>
        <span className={`block ${titleCls}`}>{SITE_NAME}</span>
        {description ? (
          <span className="mt-1.5 block text-sm text-gray-400 max-w-md">{description}</span>
        ) : null}
      </div>
    </>
  )

  const rowCls =
    variant === 'nav'
      ? 'flex items-center gap-3 sm:gap-3.5 min-w-0 shrink-0 group'
      : 'flex items-center gap-3.5 sm:gap-4 min-w-0'

  if (href != null) {
    return (
      <Link href={href} className={rowCls} onClick={onClick}>
        {body}
      </Link>
    )
  }
  return <div className={rowCls}>{body}</div>
}
