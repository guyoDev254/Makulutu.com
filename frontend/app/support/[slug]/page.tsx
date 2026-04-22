import { redirect } from 'next/navigation'

export default async function SupportBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const safe = slug?.trim().toLowerCase()
  if (!safe) {
    redirect('/support')
  }
  redirect(`/support?creatorSlug=${encodeURIComponent(safe)}`)
}
