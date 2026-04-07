import Image from 'next/image'
import Link from 'next/link'

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
      ? 'h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-white p-1 shadow-lg shadow-black/50 ring-2 ring-white/50'
      : 'h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-white p-1 shadow-lg shadow-black/50 ring-2 ring-white/40'

  const imgClass = 'h-full w-full rounded-full object-cover'

  const titleCls =
    variant === 'nav'
      ? 'text-2xl sm:text-3xl font-bold text-white truncate group-hover:text-violet-100 transition-colors leading-tight'
      : 'text-xl sm:text-2xl font-bold text-white leading-tight'

  const body = (
    <>
      <span className={imgWrapCls}>
        <Image
          src="/logo.png"
          alt="MohaGamer"
          width={256}
          height={256}
          className={imgClass}
          priority={priority}
        />
      </span>
      <div className={`min-w-0 ${variant === 'footer' ? 'text-center sm:text-left' : ''}`}>
        <span className={`block ${titleCls}`}>MohaGamer</span>
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
