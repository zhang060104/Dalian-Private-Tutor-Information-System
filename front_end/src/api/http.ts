import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * Axios 实例：baseURL=/api（由 vite 代理到后端 8080）
 * - 请求拦截：自动携带登录令牌（localStorage 'tutor_token'）
 * - 响应拦截：解包统一响应体 { code, message, data }，非 0 统一弹错
 */

export const TOKEN_KEY = 'tutor_token'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        ElMessage.error(body.message || '请求失败')
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      return body.data
    }
    return body
  },
  (err) => {
    const msg = err?.response?.data?.message || err?.message || '网络错误，请稍后重试'
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default http
