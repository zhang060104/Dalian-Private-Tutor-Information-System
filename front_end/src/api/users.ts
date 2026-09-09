// ============================================================================
// 学生 / 教师资料接口（真实后端）
//  - GET /api/students · GET /api/teachers · GET /api/profile · GET /api/profile/me
//  - PATCH /api/profile/me/status(0/1) · POST /api/profile/review(需 captchaToken)
// 后端 timeTable1..7 → 前端 WeekTimeTables[7]（转换层）
// ============================================================================
import http from './http'
import type { Profile, Role, WeekTimeTables } from '@/types'

/** 后端学生/教师/我的资料返回结构（驼峰由 MyBatis map-underscore-to-camel-case 提供） */
interface ProfileDTO {
  id: number
  nickname: string
  age?: number
  gender?: string
  grade: number
  subject: number
  description?: string
  address?: string | null
  qrcode?: string | null
  idcard?: string | null
  certificate?: string | null
  timeTable1: number
  timeTable2: number
  timeTable3: number
  timeTable4: number
  timeTable5: number
  timeTable6: number
  timeTable7: number
  status: number
  credit: number
  seeking: number
  isMe?: boolean
  isSuper?: boolean
}

function ttArrToObject(tt: WeekTimeTables) {
  return {
    timeTable1: tt[0],
    timeTable2: tt[1],
    timeTable3: tt[2],
    timeTable4: tt[3],
    timeTable5: tt[4],
    timeTable6: tt[5],
    timeTable7: tt[6],
  }
}

function ttFromDto(p: ProfileDTO): WeekTimeTables {
  return [
    p.timeTable1,
    p.timeTable2,
    p.timeTable3,
    p.timeTable4,
    p.timeTable5,
    p.timeTable6,
    p.timeTable7,
  ]
}

/** DTO → 前端 Profile（不暴露地址给非本人） */
function dtoToProfile(role: Role, p: ProfileDTO, exposeAddress = false): Profile {
  return {
    id: p.id,
    role,
    nickname: p.nickname,
    age: p.age,
    gender: p.gender as '男' | '女' | undefined,
    grade: p.grade,
    subject: p.subject,
    description: p.description || '',
    address: exposeAddress ? p.address ?? null : null,
    credit: p.credit,
    seeking: !!p.seeking,
    status: p.status,
    timeTables: ttFromDto(p),
    isSelf: !!p.isMe,
    phoneVisible: !!p.isMe,
    isSuperAdmin: !!p.isSuper,
  }
}

export interface ListFilter {
  grade?: number | null
  subject?: number | null
  keyword?: string
  [key: string]: unknown
}

export async function listStudents(filter?: ListFilter): Promise<Profile[]> {
  const arr = await http.get<ProfileDTO[]>('/api/students', { params: filter || {} })
  return arr.map((p) => dtoToProfile('student', p, false))
}

export async function listTeachers(filter?: ListFilter): Promise<Profile[]> {
  const arr = await http.get<ProfileDTO[]>('/api/teachers', { params: filter || {} })
  return arr.map((p) => dtoToProfile('teacher', p, false))
}

export async function getPerson(
  role: 'student' | 'teacher',
  id: number
): Promise<Profile> {
  const p = await http.get<ProfileDTO>(
    `/api/${role === 'student' ? 'students' : 'teachers'}/${id}`
  )
  return dtoToProfile(role, p, true)
}

export async function getMyProfile(role: Role): Promise<Profile> {
  const p = await http.get<ProfileDTO>('/api/profile/me', { params: { role } })
  return dtoToProfile(role, p, true)
}

export async function setSeeking(role: Role): Promise<number> {
  return http.put<number>(`/api/profile/me/status?role=${role}`)
}

/** 提交资料修改申请（进入管理员审核队列） */
export async function requestProfileChange(
  role: Role,
  captchaToken: string,
  patch: Partial<Profile>
): Promise<void> {
  const payload: Record<string, unknown> = { role, captchaToken }
  if (patch.nickname != null) payload.nickname = patch.nickname
  if (patch.age != null) payload.age = patch.age
  if (patch.gender != null) payload.gender = patch.gender
  if (patch.grade != null) payload.grade = patch.grade
  if (patch.subject != null) payload.subject = patch.subject
  if (patch.description != null) payload.description = patch.description
  if (patch.address != null) payload.address = patch.address
  if (patch.timeTables) Object.assign(payload, ttArrToObject(patch.timeTables))
  await http.post('/api/profile/review', payload)
}

/** 资料修改申请撤回 */
export async function cancelProfileChange(role: Role, id: number): Promise<void> {
  await http.delete(`/api/profile/review?role=${role}&id=${id}`)
}