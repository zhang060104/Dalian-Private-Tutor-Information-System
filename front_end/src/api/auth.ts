// ============================================================================
// 认证接口（Auth）
// 真实后端：POST /api/auth/login · POST /api/auth/register · POST /api/auth/logout
// 当前实现返回 mock。切换真实后端仅需替换本文件函数体。
// ============================================================================
import type { LoginPayload, LoginResult, RegisterPayload } from '@/types'
import { mockLogin } from '@/data/mock'
import { register as mockRegister } from '@/data/mockApi'

/** 登录（学生/教师/管理员）。角色由前端登录页 tab 选择。 */
export async function login(p: LoginPayload): Promise<LoginResult> {
  // TODO(real): return http.post('/auth/login', p)
  return mockLogin(p)
}

/** 注册入驻（学生/教师），提交后进入管理员审核队列。 */
export async function registerUser(p: RegisterPayload): Promise<{ submitted: boolean }> {
  // TODO(real): return http.post('/auth/register', p)
  mockRegister(p as RegisterPayload & { role: 'student' | 'teacher' })
  return { submitted: true }
}

/** 退出登录（清前端态即可）。 */
export async function logout(): Promise<void> {
  // TODO(real): return http.post('/auth/logout')
  localStorage.removeItem('dl_tutor_token')
  localStorage.removeItem('dl_tutor_current')
}
