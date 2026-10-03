export type PublicCreator = {
  slug: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  primaryCategory: string | null
  nextLive?: {
    title: string
    startsAt: string
    platformLabel: string
    status: 'scheduled' | 'live'
  } | null
}

export function effectiveCreatorSearchQuery(raw: string) {
  return raw.trim().toLowerCase().replace(/^@+/, '').trim()
}

export function matchesCreatorSearch(creator: PublicCreator, q: string) {
  if (!q) return true
  const hay = [creator.displayName, creator.slug, creator.primaryCategory, creator.bio]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}
