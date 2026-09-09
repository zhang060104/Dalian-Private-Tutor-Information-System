// ============================================================================
// 学生 / 教师资料接口（对齐后端契约 8083）
//  - 池列表:  GET /api/students · GET /api/teachers
//  - 他人主页: GET /api/student/{id} · /api/teacher/{id}
//  - 本人主页: GET /api/student/me · /api/teacher/me
//  - 状态切换: PUT /api/student/me/status · /api/teacher/me/status  body {status:0|1}
//  - 资料修改: POST /api/profile/review  body {captchaToken, name?, fields?, profile{...}}
//  - 撤回:     POST /api/profile/review/{id}/cancel
// 后端返回 Map（驼峰）: id/nickname/age/gender/credit/grade/subject/description/status/timeTable1..7
//  full 视图额外: phone/address/qrcode/idcard(/certificate) + isMe + orders/review
// ============================================================================
import http from './http'
import type { Profile, Role, WeekTimeTables } from '@/types'

/** 后端返回的用户资料（驼峰 Map / 实体 JSON） */
interface ProfileDTO {
  id: number
  nickname: string
  age?: number | null
  gender?: string | null
  grade: number
  subject: number
  description?: string | null
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

/** DTO → 前端 Profile（地址/电话等仅本人视图下发） */
function dtoToProfile(role: Role, p: ProfileDTO, exposeAddress = false): Profile {
  const self = !!p.isMe
  return {
    id: p.id,
    role,
    nickname: p.nickname,
    age: p.age,
    gender: p.gender as '男' | '女' | undefined,
    grade: p.grade,
    subject: p.subject,
    description: p.description || '',
    // 本人视图（isMe=true 的 me/自看主页）才有 address
    address: exposeAddress && self ? (p.address ?? null) : null,
    credit: p.credit,
    seeking: p.status === 0,
    status: p.status,
    timeTables: ttFromDto(p),
    isSelf: self,
    phoneVisible: self,
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
    `/api/${role === 'student' ? 'student' : 'teacher'}/${id}`
  )
  return dtoToProfile(role, p, true)
}

export async function getMyProfile(role: Role): Promise<Profile> {
  const path = role === 'student' ? '/api/student/me' : '/api/teacher/me'
  const p = await http.get<ProfileDTO>(path)
  return dtoToProfile(role, p, true)
}

/** 切换寻找状态（0 寻找中 / 1 停止），即时生效 */
export async function setSeeking(role: Role, status: 0 | 1): Promise<void> {
  const path = role === 'student' ? '/api/student/me/status' : '/api/teacher/me/status'
  await http.put(path, { status })
}

/** 提交资料修改申请（进入管理员审核队列） */
export async function requestProfileChange(
  role: Role,
  captchaToken: string,
  patch: Partial<Profile>
): Promise<void> {
  // 后端契约：body {captchaToken, name?, fields?, profile{...}}，角色从登录态判断
  const profile: Record<string, unknown> = {}
  if (patch.nickname != null) profile.nickname = patch.nickname
  if (patch.age != null) profile.age = patch.age
  if (patch.gender != null) profile.gender = patch.gender
  if (patch.grade != null) profile.grade = patch.grade
  if (patch.subject != null) profile.subject = patch.subject
  if (patch.description != null) profile.description = patch.description
  if (patch.address != null) profile.address = patch.address
  if (patch.timeTables) Object.assign(profile, ttArrToObject(patch.timeTables))
  await http.post('/api/profile/review', { captchaToken, profile })
}

/** 撤回资料修改申请 */
export async function cancelProfileChange(id: number): Promise<void> {
  await http.post(`/api/profile/review/${id}/cancel`)
}
