// ============================================================================
// 管理员接口（真实后端 /api/admin/**）
// ============================================================================
import http from './http'
import type { Role } from '@/types'
import { decodeSubjects as decodeSubjectsUtil } from '@/utils/subject'

/** 统计 */
export interface StatsDTO {
  teacherCount: number
  studentCount: number
  orderCount: number
  pendingRequestCount: number
}
export async function getStats(): Promise<StatsDTO> {
  return http.get<StatsDTO>('/api/admin/stats')
}

/** 待办 requestLog（type 0..5） */
export type RequestType = 0 | 1 | 2 | 3 | 4 | 5
export interface RequestDTO {
  id: number
  type: RequestType
  typeName: string
  tarId?: number
  payload: Record<string, unknown>
  createdAt: string
  adminId: number
}
export async function listRequests(opts?: {
  type?: RequestType
  pending?: boolean
}): Promise<RequestDTO[]> {
  return http.get<RequestDTO[]>('/api/admin/requests', { params: opts || {} })
}

/** 处理一条待办 */
export interface ResolvePayload {
  approve: boolean
  note?: string
  profile?: Record<string, unknown>
}
export async function resolveRequest(reqId: number, body: ResolvePayload): Promise<void> {
  await http.post(`/api/admin/requests/${reqId}/resolve`, body)
}

// ---------- 后台各页适配的视图类型（不直接来自后端，便于展示） ----------

/** 后台全订单行（已翻译 status 为中文） */
export interface AdminOrderRow {
  id: number
  studentId: number
  teacherId: number
  studentName: string
  teacherName: string
  studentCredit: number
  teacherCredit: number
  subject: number
  subjectsText: string
  status: number
  statusName: string
  stageName: string
  hourlyWage: number
  infoFee?: number
  description?: string
  createdAt: string
}

interface AdminOrderRawDTO {
  id: number
  studentId: number
  studentName: string
  studentPhone?: string
  teacherId: number
  teacherName: string
  teacherPhone?: string
  subject: number
  hourlyWage: number
  status: number
  description?: string
  verification: number
  infoFee?: number
  createdAt: string
  statusName: string
}

const STAGE_CN: Record<string, string> = {
  resume: '匹配',
  confirm: '信息确认',
  payment: '费用缴纳',
  trial: '试课',
  active: '授课服务',
  closing: '结单',
  closed: '已结束',
  dispute: '仲裁',
}

function stageOf(status: number): string {
  if ([0, 1].includes(status)) return 'resume'
  if ([2, 3, 4].includes(status)) return 'confirm'
  if (status === 5) return 'payment'
  if ([6, 7, 8].includes(status)) return 'trial'
  if (status === 9) return 'active'
  if ([10, 11].includes(status)) return 'closing'
  if (status === 12) return 'closed'
  return 'resume'
}

// 用动态 import 避免 orderStatus 循环依赖
async function translateStatus(status: number): Promise<string> {
  try {
    const mod = await import('@/utils/order')
    return mod.orderStatus(status).name
  } catch {
    return `状态 ${status}`
  }
}

/** 全部订单（管理后台全量一览） */
export async function listAllOrders(): Promise<AdminOrderRow[]> {
  const arr = await http.get<AdminOrderRawDTO[]>('/api/admin/orders')
  const out: AdminOrderRow[] = []
  for (const o of arr) {
    out.push({
      id: o.id,
      studentId: o.studentId,
      teacherId: o.teacherId,
      studentName: o.studentName,
      teacherName: o.teacherName,
      studentCredit: 100,
      teacherCredit: 100,
      subject: o.subject,
      subjectsText: decodeSubjectsLocal(o.subject).join('、') || '—',
      status: o.status,
      statusName: o.statusName || (await translateStatus(o.status)),
      stageName: STAGE_CN[stageOf(o.status)] ?? '其他',
      hourlyWage: o.hourlyWage,
      infoFee: o.infoFee,
      description: o.description,
      createdAt: o.createdAt,
    })
  }
  return out.sort((a, b) => (a.id > b.id ? -1 : 1))
}

/** 某订单的后台视图（供 OrderAdminDetail / UserArchive） */
export interface AdminOrderDetailView {
  id: number
  studentId: number
  teacherId: number
  studentName: string
  teacherName: string
  studentCredit: number
  teacherCredit: number
  studentPhone?: string
  teacherPhone?: string
  subject: number
  subjectsText: string
  status: number
  statusName: string
  statusDesc: string
  hourlyWage: number
  infoFee: number
  description: string
  verification: number
  teaDepositImg?: string
  stuDepositImg?: string
  infoFeeImg?: string
  infoFeeQr?: string
  timeTables: [number, number, number, number, number, number, number]
  createdAt: string
}

export async function getOrderAdmin(orderId: number): Promise<AdminOrderDetailView> {
  const arr = await http.get<AdminOrderRawDTO[]>('/api/admin/orders')
  const o = arr.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  // 详情需补充 teaDepositImg 等（管理后台详细 DTO）—— 走另一个 admin 详情接口
  const detail = await http
    .get<{
      studentId: number
      teacherId: number
      studentName: string
      teacherName: string
      studentPhone?: string
      teacherPhone?: string
      studentCredit?: number
      teacherCredit?: number
      subject: number
      subjectsText?: string
      status: number
      hourlyWage: number
      infoFee?: number
      description?: string
      verification: number
      teaDepositImg?: string
      stuDepositImg?: string
      infoFeeImg?: string
      infoFeeQr?: string
      timeTable1: number
      timeTable2: number
      timeTable3: number
      timeTable4: number
      timeTable5: number
      timeTable6: number
      timeTable7: number
      createdAt: string
    }>(`/api/admin/orders/${orderId}`)
    .catch(() => null)

  const statusName = o.statusName || (await translateStatus(o.status))
  const statusDesc = (await import('@/utils/order')).orderStatus(o.status).desc
  if (!detail) {
    return {
      id: o.id,
      studentId: o.studentId,
      teacherId: o.teacherId,
      studentName: o.studentName,
      teacherName: o.teacherName,
      studentCredit: 100,
      teacherCredit: 100,
      subject: o.subject,
      subjectsText: decodeSubjectsLocal(o.subject).join('、') || '—',
      status: o.status,
      statusName,
      statusDesc,
      hourlyWage: o.hourlyWage,
      infoFee: o.infoFee ?? 0,
      description: o.description ?? '',
      verification: o.verification,
      timeTables: [0, 0, 0, 0, 0, 0, 0],
      createdAt: o.createdAt,
    }
  }
  return {
    id: o.id,
    studentId: detail.studentId,
    teacherId: detail.teacherId,
    studentName: detail.studentName,
    teacherName: detail.teacherName,
    studentCredit: detail.studentCredit ?? 100,
    teacherCredit: detail.teacherCredit ?? 100,
    studentPhone: detail.studentPhone,
    teacherPhone: detail.teacherPhone,
    subject: detail.subject,
    subjectsText: detail.subjectsText || decodeSubjectsLocal(detail.subject).join('、') || '—',
    status: detail.status,
    statusName,
    statusDesc,
    hourlyWage: detail.hourlyWage,
    infoFee: detail.infoFee ?? 0,
    description: detail.description ?? '',
    verification: detail.verification,
    teaDepositImg: detail.teaDepositImg,
    stuDepositImg: detail.stuDepositImg,
    infoFeeImg: detail.infoFeeImg,
    infoFeeQr: detail.infoFeeQr,
    timeTables: [
      detail.timeTable1,
      detail.timeTable2,
      detail.timeTable3,
      detail.timeTable4,
      detail.timeTable5,
      detail.timeTable6,
      detail.timeTable7,
    ],
    createdAt: detail.createdAt,
  }
}

/** 该用户参与的全部订单（行级摘要） */
export async function listOrdersForUserAdmin(role: 'student' | 'teacher', id: number): Promise<AdminOrderRow[]> {
  const all = await listAllOrders()
  return all.filter((o) => (role === 'student' ? o.studentName : o.teacherName))
}

// ---------- 用户 ----------

/** 后台用户视图（含手机号等敏感字段） */
export interface AdminUserView {
  id: number
  role: 'student' | 'teacher'
  nickname: string
  phone: string
  status: number
  seeking: boolean
  grade: number
  subject: number
  credit: number
  age?: number
  gender?: string
  description?: string
  address?: string
  timeTables: [number, number, number, number, number, number, number]
}

export async function listAllUsers(): Promise<AdminUserView[]> {
  const [ts, ss] = await Promise.all([
    http.get<AdminUserView[]>('/api/admin/teachers'),
    http.get<AdminUserView[]>('/api/admin/students'),
  ])
  return [...ts, ...ss]
}

export async function getUserAdmin(role: 'student' | 'teacher', id: number): Promise<AdminUserView | null> {
  const arr = await listAllUsers()
  return arr.find((u) => u.role === role && u.id === id) ?? null
}

// ---------- 管理员账号（仅超管） ----------

export interface AdminDTO {
  id: number
  nickname: string
  phone: string
  isSuper: boolean
}

export async function listAdmins(): Promise<AdminDTO[]> {
  return http.get<AdminDTO[]>('/api/admin/admins')
}
export async function createAdmin(body: { nickname: string; phone: string; password: string }): Promise<void> {
  await http.post('/api/admin/admins', body)
}
export async function deleteAdmin(id: number): Promise<void> {
  await http.delete(`/api/admin/admins/${id}`)
}

// ---------- 信用分 / 信息费收款码 ----------

export async function adjustCreditAdmin(role: Role, id: number, credit: number): Promise<void> {
  await http.post('/api/admin/credit', { role, id, credit })
}

export async function uploadInfoFeeQr(orderId: number, url: string): Promise<void> {
  await http.post(`/api/admin/orders/${orderId}/info-fee-qr`, { url })
}

// ---------- 本地工具 ----------

function decodeSubjectsLocal(mask: number): string[] {
  return [...decodeSubjectsUtil(mask)]
}