// ============================================================================
// 学生 / 教师资料接口
// 真实后端：GET /api/students · GET /api/teachers · GET /api/profile · PATCH ...
// ============================================================================
import type { Profile, Role } from '@/types'
import { getDb } from '@/data/mock'
import {
  rawUser, toProfile, toPrivate, toggleSeeking as mockToggle, submitProfileChange,
} from '@/data/mockApi'

const withSelf = (p: Profile, meRole: Role | null, meId: number | null): Profile => {
  const isSelf = !!meRole && p.role === meRole && p.id === meId
  return { ...p, isSelf }
}

/**
 * 获取学生概览列表（只含 status=0 正在寻找家教的；脱敏，不含私密字段/地址）。
 * 支持筛选：grade 精确、subject 位掩码交集、keyword 昵称/简介、stage。
 */
export async function listStudents(filter?: {
  grade?: number | null
  subject?: number | null
  keyword?: string
}): Promise<Profile[]> {
  // TODO(real): return http.get('/students', { params: filter })
  const d = getDb()
  let list = d.students.filter((s) => s.status === 0)
  if (filter?.grade != null) list = list.filter((s) => s.grade === filter.grade)
  if (filter?.subject) list = list.filter((s) => (s.subject & (filter.subject as number)) !== 0)
  if (filter?.keyword) {
    const k = filter.keyword.trim().toLowerCase()
    list = list.filter((s) => s.nickname.toLowerCase().includes(k) || s.description.toLowerCase().includes(k))
  }
  // 脱敏：对外列表不暴露地址（location 本就 null）
  return list.map((s) => {
    const p = toProfile(s, false)
    delete (p as { address?: string | null }).address
    return p
  })
}

/** 教师概览列表（同学生逻辑） */
export async function listTeachers(filter?: {
  grade?: number | null
  subject?: number | null
  keyword?: string
}): Promise<Profile[]> {
  // TODO(real): return http.get('/teachers', { params: filter })
  const d = getDb()
  let list = d.teachers.filter((s) => s.status === 0)
  if (filter?.grade != null) list = list.filter((s) => s.grade === filter.grade)
  if (filter?.subject) list = list.filter((s) => (s.subject & (filter.subject as number)) !== 0)
  if (filter?.keyword) {
    const k = filter.keyword.trim().toLowerCase()
    list = list.filter((s) => s.nickname.toLowerCase().includes(k) || s.description.toLowerCase().includes(k))
  }
  return list.map((s) => {
    const p = toProfile(s, false)
    delete (p as { address?: string | null }).address
    return p
  })
}

/** 获取某学生/教师的个人主页资料（纯净单人；可带 isSelf 供本人提供修改入口） */
export async function getPerson(role: 'student' | 'teacher', id: number, meRole: Role | null = null, meId: number | null = null): Promise<Profile> {
  // TODO(real): return http.get(`/${role === 'student' ? 'students' : 'teachers'}/${id}`)
  const u = rawUser(role, id)
  if (!u) throw new Error('用户不存在')
  return withSelf(toProfile(u), meRole, meId)
}

/** 获取我的资料（真实后端返回本人含私密字段；mock 取私密字段拼接） */
export async function getMyProfile(role: Role, id: number): Promise<Profile> {
  // TODO(real): return http.get('/profile/me')
  const u = rawUser(role, id)
  if (!u) throw new Error('用户不存在')
  const p = toProfile(u, true)
  return p
}

/** 我的私密资料（个人主页本人查看联系方式/收款码） */
export async function getMyPrivate(role: Role, id: number) {
  const u = rawUser(role, id)
  return u ? toPrivate(u) : null
}

/** 切换「正在寻找」状态 0/1 */
export async function setSeeking(role: Role, id: number): Promise<number> {
  // TODO(real): return http.post('/profile/toggle-status')
  return mockToggle(role, id)
}

/** 提交个人资料修改（进入管理员审核） */
export async function requestProfileChange(role: Role, id: number, patch: Partial<Profile>): Promise<void> {
  // TODO(real): return http.post('/profile/review', { patch })
  submitProfileChange(role, id, patch)
}
