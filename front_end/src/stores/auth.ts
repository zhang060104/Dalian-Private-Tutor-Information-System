// 会话状态：登录态（学生/教师/管理员统一管理）
import { defineStore } from 'pinia'
import type { Role } from '@/types'
import { login as apiLogin, logout as apiLogout } from '@/api/auth'
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
    async logout() {
      await apiLogout()
      this.session = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CUR_KEY)
    },
  },
})
