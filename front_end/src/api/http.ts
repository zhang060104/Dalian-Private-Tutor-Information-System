// ============================================================================
// HTTP 客户端 —— 真实后端接入预留
// 当前各 api 模块调用 mock（src/data/mock.ts）。将来接入后端时，只需把
// 对应 api 模块内部改为走下方 http 请求即可；页面与 store 调用签名不变。
// ============================================================================
import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_BASE ?? '/api'

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// 统一携带 token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('dl_tutor_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 统一错误处理：401 清登录态
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dl_tutor_token')
      localStorage.removeItem('dl_tutor_current')
    }
    return Promise.reject(err)
  },
)

export default http
