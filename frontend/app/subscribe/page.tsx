import { redirect } from 'next/navigation'

/** Legacy URL — bookmarks and old links still use /subscribe */
export default function SubscribeRedirectPage() {
  redirect('/support')
}
