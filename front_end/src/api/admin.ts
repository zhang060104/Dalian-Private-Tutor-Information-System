// ============================================================================
// 管理后台接口（独立于门户，无任何入口跳转，仅 /admin 直达）
// 真实后端：GET /api/admin/requests · POST /api/admin/requests/{id}/resolve ...
// ============================================================================
import type { Profile, RegisterPayload, Role } from '@/types'
import { getDb } from '@/data/mock'
import * as M from '@/data/mockApi'

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
