// 会话状态：登录态（学生/教师/管理员统一管理）
import { defineStore } from 'pinia'
import type { Role } from '@/types'
import { login as apiLogin, logout as apiLogout, adminLogin as apiAdminLogin } from '@/api/auth'
import type { LoginPayload, LoginResult } from '@/types'

const TOKEN_KEY = 'dl_tutor_token'
const CUR_KEY = 'dl_tutor_current'

export interface Session {
  token: string
  role: Role
  id: number
  nickname: string
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(CUR_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: loadSession() as Session | null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (s) => !!s.session,
    role: (s): Role | null => s.session?.role ?? null,
    userId: (s): number | null => s.session?.id ?? null,
    nickname: (s) => s.session?.nickname ?? '',
  },
  actions: {
    /** 门户登录（学生/教师），走通用账号体系。 */
    async login(p: LoginPayload): Promise<LoginResult> {
      this.loading = true
      try {
        const res = await apiLogin(p)
        const session: Session = { token: res.token, role: res.role, id: res.id, nickname: res.nickname }
        this.session = session
        localStorage.setItem(TOKEN_KEY, res.token)
        localStorage.setItem(CUR_KEY, JSON.stringify(session))
        return res
      } finally {
        this.loading = false
      }
    },
    /** 管理员登录：独立的认证通道与接口，与管理门户 login 完全分离。 */
    async loginAdmin(account: string, password: string): Promise<LoginResult> {
      this.loading = true
      try {
        const res = await apiAdminLogin(account, password)
        const session: Session = { token: res.token, role: res.role, id: res.id, nickname: res.nickname }
        this.session = session
        localStorage.setItem(TOKEN_KEY, res.token)
        localStorage.setItem(CUR_KEY, JSON.stringify(session))
        return res
      } finally {
        this.loading = false
      }
    },
    async logout() {
      await apiLogout()
      this.session = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CUR_KEY)
    },
  },
})
