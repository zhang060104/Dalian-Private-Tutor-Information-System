// ============================================================================
// 管理后台接口（独立于门户，无任何入口跳转，仅 /admin 直达）
// 真实后端：GET /api/admin/requests · POST /api/admin/requests/{id}/resolve ...
// ============================================================================
import type { Profile, RegisterPayload, Role } from '@/types'
import { getDb } from '@/data/mock'
import * as M from '@/data/mockApi'
import { decodeSubjects } from '@/utils/subject'
import { orderStatus } from '@/utils/order'

/** 管理端待办的可读视图 */
export type RequestView =
  | { id: number; type: 0 | 1; typeLabel: string; tarID: number; createdAt: string; role: 'student' | 'teacher'; kind: 'register' | 'edit-profile'; summary: string; payload: RegisterPayload | { role: Role; patch: Partial<Profile> } }
  | { id: number; type: 2 | 3 | 4; typeLabel: string; tarID: number; createdAt: string; kind: 'payment'; payKind: 'teaDeposit' | 'stuDeposit' | 'infoFee'; orderId: number; payerRole: Role; amount: number; img: string }
  | { id: number; type: 5; typeLabel: string; tarID: number; createdAt: string; kind: 'arbitration'; orderId: number; initiatorRole: Role; text: string; evidence: string[] }

const TYPE_LABEL: Record<number, string> = {
  0: '教师个人信息修改', 1: '学生个人信息修改', 2: '订单-教师定金核验', 3: '订单-学生定金核验', 4: '订单-教师信息费核验', 5: '订单毁约仲裁',
}

function safeParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

/** 列出全部待办（管理员可介入处理；未被认领的 admin_id=-1） */
export function listPendingRequests(): RequestView[] {
  const d = getDb()
  const views: RequestView[] = []
  for (const r of [...d.requests].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) {
    const base = { id: r.id, type: r.type as RequestView['type'], typeLabel: TYPE_LABEL[r.type] ?? `类型${r.type}`, tarID: r.tarID, createdAt: r.createdAt }
    if (r.type === 0 || r.type === 1) {
      const p = safeParse<{ action: 'register' | 'edit-profile'; role: 'student' | 'teacher'; payload?: RegisterPayload; patch?: Partial<Profile> }>(r.json)
      if (!p) continue
      if (p.action === 'register' && p.role && p.payload) {
        views.push({ ...base, type: r.type, kind: 'register', role: p.role, summary: `注册入驻：${p.payload.nickname}（${p.payload.phone}）`, payload: p.payload })
      } else if (p.action === 'edit-profile' && p.role) {
        const u = M.rawUser(p.role, r.tarID)
        views.push({ ...base, type: r.type, kind: 'edit-profile', role: p.role, summary: `资料修改：${u?.nickname ?? '#' + r.tarID}`, payload: { role: p.role, patch: p.patch ?? {} } })
      }
    } else if (r.type === 2 || r.type === 3 || r.type === 4) {
      const p = safeParse<{ kind: 'teaDeposit' | 'stuDeposit' | 'infoFee'; img: string; role: Role; amount: number }>(r.json)
      if (!p) continue
      views.push({ ...base, type: r.type, kind: 'payment', payKind: p.kind, orderId: r.tarID, payerRole: p.role, amount: p.amount ?? 0, img: p.img ?? '' })
    } else if (r.type === 5) {
      const p = safeParse<{ role: Role; text: string; evidence: string[] }>(r.json)
      if (!p) continue
      views.push({ ...base, type: 5, kind: 'arbitration', orderId: r.tarID, initiatorRole: p.role, text: p.text ?? '', evidence: p.evidence ?? [] })
    }
  }
  return views
}

// ---------------------- 处理动作（薄转发 mockApi） ----------------------
export function approveUserRequest(requestId: number, adminId: number, manualPatch?: Partial<Profile>): void {
  M.handleUserRequest(requestId, adminId, 'approve', manualPatch)
}
export function rejectUserRequest(requestId: number, adminId: number): void {
  M.handleUserRequest(requestId, adminId, 'reject')
}
export function approvePayment(requestId: number, orderId: number, kind: 'teaDeposit' | 'stuDeposit' | 'infoFee'): void {
  M.approvePayment(orderId, kind, requestId)
}
export function rejectPayment(requestId: number): void {
  M.rejectPayment(requestId)
}
export function resolveArbitration(orderId: number, requestId: number, penalty?: { role: Role; userId: number; delta: number }): void {
  M.resolveArbitration(orderId, requestId, '', penalty?.role, penalty?.userId, penalty?.delta)
}
export { adjustCredit as adjustCreditAdmin, listAdmins, createAdmin, deleteAdmin } from '@/data/mockApi'

/** 管理员视角：全部学生/教师（含信用分），用于信用分调整 */
export function listAllUsers(): { role: 'student' | 'teacher'; id: number; nickname: string; grade: number; credit: number; seeking: boolean }[] {
  const d = getDb()
  const map = (role: 'student' | 'teacher') => (u: { role: string; id: number; nickname: string; grade: number; credit: number; status: number }) =>
    ({ role, id: u.id, nickname: u.nickname, grade: u.grade, credit: u.credit ?? 100, seeking: u.status === 0 })
  return [...d.students.map(map('student')), ...d.teachers.map(map('teacher'))]
}

/** 取仲裁订单的双方概要，便于管理员裁定扣分对象 */
export function getOrderParties(orderId: number): { student_id: number; teacher_id: number; studentName: string; teacherName: string } | null {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) return null
  const stu = d.students.find((s) => s.id === o.student_id)
  const tea = d.teachers.find((t) => t.id === o.teacher_id)
  return { student_id: o.student_id, teacher_id: o.teacher_id, studentName: stu?.nickname ?? '学生#' + o.student_id, teacherName: tea?.nickname ?? '教师#' + o.teacher_id }
}

// ---------------------- 全部订单（后台只读概览） ----------------------

/** 后台订单列表行视图：已翻译状态为中文文案 */
export interface AdminOrderRow {
  id: number
  studentName: string
  teacherName: string
  /** 状态数值（0-12，业务判定用） */
  status: number
  /** 状态中文名（orderStatus().name，供直接展示） */
  statusName: string
  /** 所属业务阶段中文（概览归属，如 缴费/授课） */
  stageName: string
  subjectsText: string
  hourly_wage: number
  createdAt: string
}

/** 业务阶段 → 中文归属（后台列表分组用） */
const STAGE_CN: Record<string, string> = {
  resume: '匹配', confirm: '信息确认', payment: '费用缴纳', trial: '试课', active: '授课服务', closing: '结单', closed: '已结束', dispute: '仲裁',
}

type DbOrder = import('@/types').Order

/** 把订单列表映射为后台行视图（含双方昵称、状态中文），供全部订单 / 按用户历史订单复用 */
function toAdminRows(d: ReturnType<typeof getDb>, orders: DbOrder[]): AdminOrderRow[] {
  const nameOf = (role: 'student' | 'teacher', id: number) =>
    (role === 'student' ? d.students.find((s) => s.id === id) : d.teachers.find((t) => t.id === id))?.nickname ?? `#${id}`
  return [...orders]
    .sort((a, b) => (a.id > b.id ? -1 : 1))
    .map((o) => {
      const st = orderStatus(o.status)
      return {
        id: o.id,
        studentName: nameOf('student', o.student_id),
        teacherName: nameOf('teacher', o.teacher_id),
        status: o.status,
        statusName: st.name,
        stageName: STAGE_CN[st.stage] ?? '其他',
        subjectsText: decodeSubjects(o.subject).join('、') || '—',
        hourly_wage: o.hourly_wage,
        createdAt: o.createdAt,
      }
    })
}

/** 全部订单（管理后台全量一览，含进行中与已结束） */
export function listAllOrders(): AdminOrderRow[] {
  return toAdminRows(getDb(), getDb().orders)
}

/** 某位用户参与的全部订单（含历史/进行中），供后台档案页查看个人订单足迹 */
export function listOrdersForUserAdmin(role: 'student' | 'teacher', userId: number): AdminOrderRow[] {
  const d = getDb()
  const mine = d.orders.filter((o) => (role === 'student' ? o.student_id === userId : o.teacher_id === userId))
  return toAdminRows(d, mine)
}

/** 后台读取某用户公开资料（不含联系方式等私密字段） */
export function getUserAdmin(role: 'student' | 'teacher', userId: number): Profile | null {
  const u = M.rawUser(role, userId)
  return u ? M.toProfile(u, false) : null
}

/** 后台只读订单详情（含双方与完整缴费核验标记），供管理员查看，无操作按钮 */
export function getOrderAdmin(orderId: number): {
  id: number
  studentName: string
  teacherName: string
  status: number
  statusName: string
  statusDesc: string
  subjectsText: string
  hourly_wage: number
  infoFee: number
  description: string
  verification: number
  createdAt: string
  timeTables: [number, number, number, number, number, number, number]
} | null {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) return null
  const stu = d.students.find((s) => s.id === o.student_id)
  const tea = d.teachers.find((t) => t.id === o.teacher_id)
  const st = orderStatus(o.status)
  return {
    id: o.id,
    studentName: stu?.nickname ?? '学生#' + o.student_id,
    teacherName: tea?.nickname ?? '教师#' + o.teacher_id,
    status: o.status,
    statusName: st.name,
    statusDesc: st.desc,
    subjectsText: decodeSubjects(o.subject).join('、') || '—',
    hourly_wage: o.hourly_wage,
    infoFee: o.infoFee || o.hourly_wage * 2,
    description: o.description,
    verification: o.verification,
    createdAt: o.createdAt,
    timeTables: o.timeTables,
  }
}
