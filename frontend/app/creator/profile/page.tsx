'use client'

import { CreatorProfileSettings } from '@/components/creator/CreatorProfileSettings'

/** Edit public profile anytime; main hub is `/creator/workspace`. */
export default function CreatorProfilePage() {
  return <CreatorProfileSettings mode="settings" />
}
