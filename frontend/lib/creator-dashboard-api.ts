import axios from 'axios'
import { API_BASE_URL } from './api-origin'
import { getCreatorToken } from './creator-auth'

export const creatorDashboardApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

creatorDashboardApi.interceptors.request.use(
  (config) => {
    const token = getCreatorToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

creatorDashboardApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('creatorToken')
      localStorage.removeItem('creatorUser')
      window.location.href = '/creator/login'
    }
    return Promise.reject(error)
  },
)
