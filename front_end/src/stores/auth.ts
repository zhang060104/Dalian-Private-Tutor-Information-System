// 会话状态：登录态（学生/教师/管理员统一管理）
import { defineStore } from 'pinia'
import type { Role } from '@/types'
import {
  login as apiLogin,
  adminLogin as apiAdminLogin,
  type LoginResultDTO,
} from '@/api/auth'

const TOKEN_KEY = 'dl_tutor_token'
const CUR_KEY = 'dl_tutor_current'

export interface Session {
  token: string
  role: Role
  id: number
  nickname: string
  isSuper?: boolean
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(CUR_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function applySession(res: LoginResultDTO): Session {
  const session: Session = {
    token: res.token,
    role: res.role,
    id: res.id,
    nickname: res.nickname,
    isSuper: !!res.isSuper,
  }
  localStorage.setItem(TOKEN_KEY, res.token)
  localStorage.setItem(CUR_KEY, JSON.stringify(session))
  return session
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
    isSuperAdmin: (s) => s.session?.role === 'admin' && !!s.session.isSuper,
  },
  actions: {
    /** 学生/教师登录 */
    async login(role: Role, phone: string, password: string): Promise<LoginResultDTO> {
      this.loading = true
      try {
        const res = await apiLogin(role, phone, password)
        this.session = applySession(res)
        return res
      } finally {
        this.loading = false
      }
    },
    /** 管理员登录：独立通道 */
    async loginAdmin(account: string, password: string): Promise<LoginResultDTO> {
      this.loading = true
      try {
        const res = await apiAdminLogin(account, password)
        this.session = applySession(res)
        return res
      } finally {
        this.loading = false
      }
    },
    /** 仅清本地会话（后端无 /logout 接口） */
    async logout() {
      this.session = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CUR_KEY)
    },
  },
})