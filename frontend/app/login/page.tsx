'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Loader2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import api from '@/lib/api'
import {
  AuthLoginShell,
  AuthPasswordInput,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', formData)

      localStorage.setItem('adminToken', response.data.accessToken)
      localStorage.setItem('adminUser', JSON.stringify(response.data.admin))

      Swal.fire({
        icon: 'success',
        title: 'Signed in',
        text: `Welcome back, ${response.data.admin.username}.`,
        timer: 1500,
        showConfirmButton: false,
      })

      router.push('/admin')
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials. Please try again.'
      setError(errorMessage)

      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Platform admin"
      subtitle="Sign in to manage platform-wide settings (not creator workspaces)"
    >
      {error ? (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className={authLabelClass}>
            Username or email
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className={authInputClass}
              placeholder="Admin username or email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <AuthPasswordInput
            id="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </AuthLoginShell>
  )
}
