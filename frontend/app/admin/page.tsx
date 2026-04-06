'use client'

import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { AdminDashboardView } from '@/components/admin/AdminDashboardView'

export default function AdminPage() {
  const admin = useAdminDashboard()
  return <AdminDashboardView admin={admin} />
}
