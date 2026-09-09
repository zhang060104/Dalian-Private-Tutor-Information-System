import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

/** 统一响应：HTTP 200 + {code,message,data}，code=0 表示成功 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

const TOKEN_KEY = 'dl_tutor_token'

const rawHttp = axios.create({
  timeout: 15000,
})

rawHttp.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

function clearAuthAndRedirect() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('dl_tutor_current')
  if (location.pathname.startsWith('/admin')) {
    if (location.pathname !== '/admin') location.href = '/admin'
  } else if (!location.pathname.startsWith('/login')) {
    location.href = '/login'
  }
}

/** 统一请求：解包 code/data，弹业务错，401 清登录 */
async function request<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, opts?: {
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
  raw?: boolean // true 时直接返回 data（兼容文件上传等非信封响应）
}): Promise<T> {
  try {
    const cfg: AxiosRequestConfig = {
      method,
      url,
      params: opts?.params,
      data: opts?.data,
      headers: opts?.headers,
    }
    const resp = await rawHttp.request<unknown>(cfg)
    if (opts?.raw) return resp.data as T
    const body = resp.data as ApiEnvelope<T> | undefined
    if (!body || typeof body !== 'object' || !('code' in body)) {
      return resp.data as T
    }
    if (body.code === 0) return body.data
    if (body.code === 401) clearAuthAndRedirect()
    const msg = body.message || `请求失败（${body.code}）`
    ElMessage.error(msg)
    throw new Error(msg)
  } catch (e) {
    if (e instanceof Error) throw e
    if (axios.isAxiosError(e)) {
      const err = e as AxiosError
      const status = err.response?.status
      let msg = err.message
      if (status === 401) {
        clearAuthAndRedirect()
        msg = '登录已失效，请重新登录'
      } else if (status && status >= 500) {
        msg = '服务器异常，请稍后重试'
      } else if (err.code === 'ECONNABORTED') {
        msg = '请求超时，请检查网络或后端是否运行'
      }
      ElMessage.error(msg)
      throw new Error(msg)
    }
    throw e
  }
}

const http = {
  get: <T>(url: string, opts?: { params?: Record<string, unknown> }) =>
    request<T>('get', url, opts),
  post: <T>(url: string, data?: unknown, opts?: { headers?: Record<string, string>; raw?: boolean }) =>
    request<T>('post', url, { data, ...(opts || {}) }),
  put: <T>(url: string, data?: unknown, opts?: { headers?: Record<string, string> }) =>
    request<T>('put', url, { data, ...(opts || {}) }),
  delete: <T>(url: string, opts?: { params?: Record<string, unknown> }) =>
    request<T>('delete', url, opts),
}

export default http