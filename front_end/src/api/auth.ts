import http from './http'
import type { Role } from '@/types'

/** 后端登录返回 data 字段（驼峰已统一） */
export interface LoginResultDTO {
  token: string
  id: number
  nickname: string
  role: Role
  phone: string
  status: number
  isSuper?: boolean
}

/** 入驻注册入参（后端契约字段） */
export interface RegisterPayloadDTO {
  role: 'student' | 'teacher'
  phone: string
  password: string
  captchaToken: string
  nickname: string
  age?: number
  gender?: string
  grade: number
  subject: number
  description?: string
  address?: string
  timeTable1: number
  timeTable2: number
  timeTable3: number
  timeTable4: number
  timeTable5: number
  timeTable6: number
  timeTable7: number
  qrcode?: string
  idcard?: string
  certificate?: string
}

/** 学生/教师登录（role 必填） */
export async function login(role: Role, phone: string, password: string): Promise<LoginResultDTO> {
  return http.post<LoginResultDTO>('/api/auth/login', { role, phone, password })
}

/** 管理员登录（独立通道） */
export async function adminLogin(account: string, password: string): Promise<LoginResultDTO> {
  return http.post<LoginResultDTO>('/api/auth/login', { role: 'admin', phone: account, password })
}

/** 入驻注册（需 captchaToken） */
export async function register(payload: RegisterPayloadDTO): Promise<{ id: number }> {
  return http.post<{ id: number }>('/api/auth/register', payload)
}