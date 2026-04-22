'use client'

import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { AdminDashboardView } from '@/components/admin/AdminDashboardView'

export default function CreatorWorkspacePage() {
  const admin = useAdminDashboard('creator')
  return <AdminDashboardView admin={admin} />
}
