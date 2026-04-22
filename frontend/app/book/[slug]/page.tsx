import { redirect } from 'next/navigation'

export default function BookBySlugPage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = encodeURIComponent(params.slug)
  redirect(`/book?creatorSlug=${slug}`)
}
