// ============================================================================
// 管理员接口（真实后端 /api/admin/**）
// ============================================================================
import http from './http'
import type { Role } from '@/types'
import { decodeSubjects as decodeSubjectsUtil } from '@/utils/subject'
import { ORDER_STATUS } from '@/utils/order'

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
  adminId: number
  createdAt: string
  /** 后端已把 json 解析为对象下发；type 0/1 形如 {kind,name,fields?,profile:{...},submittedAt} */
  payload: Record<string, unknown>
  /** 后端仅 type 0/1 附带（账号昵称/手机号） */
  targetName?: string | null
  targetPhone?: string | null
  /** 后端仅 type 2..5 附带（关联订单） */
  orderId?: number
  orderStatus?: number
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
  /** 后端原行（含凭证图/时间表/双方手机号，后台详情页直接取用） */
  raw: AdminOrderRawDTO
}

/** GET /api/admin/orders 返回的行（全字段，可直接支撑后台详情页） */
interface AdminOrderRawDTO {
  id: number
  studentId: number
  studentName: string
  studentPhone?: string | null
  teacherId: number
  teacherName: string
  teacherPhone?: string | null
  studentCredit?: number
  teacherCredit?: number
  subject: number
  hourlyWage: number
  status: number
  description?: string | null
  verification: number
  infoFee?: number | null
  createdAt: string
  updatedAt?: string | null
  depositImgTea?: string | null
  depositImgStu?: string | null
  infoFeeImg?: string | null
  infoFeeQr?: string | null
  timeTable1?: number
  timeTable2?: number
  timeTable3?: number
  timeTable4?: number
  timeTable5?: number
  timeTable6?: number
  timeTable7?: number
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

function statusNameOf(status: number): string {
  return ORDER_STATUS.find((s) => s.value === status)?.name ?? `状态 ${status}`
}
function statusDescOf(status: number): string {
  return ORDER_STATUS.find((s) => s.value === status)?.desc ?? ''
}

/** 全部订单（管理后台全量一览，行内已含凭证图/时间表/双方手机号/信用分） */
export async function listAllOrders(): Promise<AdminOrderRow[]> {
  const arr = await http.get<AdminOrderRawDTO[]>('/api/admin/orders')
  const out: AdminOrderRow[] = arr.map((o) => ({
    id: o.id,
    studentId: o.studentId,
    teacherId: o.teacherId,
    studentName: o.studentName,
    teacherName: o.teacherName,
    studentCredit: o.studentCredit ?? 100,
    teacherCredit: o.teacherCredit ?? 100,
    subject: o.subject,
    subjectsText: decodeSubjectsLocal(o.subject).join('、') || '—',
    status: o.status,
    statusName: statusNameOf(o.status),
    stageName: STAGE_CN[stageOf(o.status)] ?? '其他',
    hourlyWage: o.hourlyWage,
    infoFee: o.infoFee ?? 0,
    description: o.description ?? '',
    createdAt: o.createdAt,
    raw: o,
  }))
  return out.sort((a, b) => (a.id > b.id ? -1 : 1))
}

/** 某订单的后台视图（供 OrderAdminDetail / UserArchive；后端无单查接口，直接由列表行组装） */
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

export async function getOrderAdmin(orderId: number): Promise<AdminOrderDetailView | null> {
  const all = await listAllOrders()
  const row = all.find((x) => x.id === orderId)
  if (!row) return null
  const o = row.raw
  return {
    id: o.id,
    studentId: o.studentId,
    teacherId: o.teacherId,
    studentName: o.studentName,
    teacherName: o.teacherName,
    studentCredit: o.studentCredit ?? 100,
    teacherCredit: o.teacherCredit ?? 100,
    studentPhone: o.studentPhone ?? undefined,
    teacherPhone: o.teacherPhone ?? undefined,
    subject: o.subject,
    subjectsText: decodeSubjectsLocal(o.subject).join('、') || '—',
    status: o.status,
    statusName: statusNameOf(o.status),
    statusDesc: statusDescOf(o.status),
    hourlyWage: o.hourlyWage,
    infoFee: o.infoFee ?? 0,
    description: o.description ?? '',
    verification: o.verification,
    teaDepositImg: o.depositImgTea ?? undefined,
    stuDepositImg: o.depositImgStu ?? undefined,
    infoFeeImg: o.infoFeeImg ?? undefined,
    infoFeeQr: o.infoFeeQr ?? undefined,
    timeTables: [
      o.timeTable1 ?? 0,
      o.timeTable2 ?? 0,
      o.timeTable3 ?? 0,
      o.timeTable4 ?? 0,
      o.timeTable5 ?? 0,
      o.timeTable6 ?? 0,
      o.timeTable7 ?? 0,
    ],
    createdAt: o.createdAt,
  }
}

/** 该用户参与的全部订单（行级摘要） */
// ---------- 用户完整档案（信用分管理 → 查看） ----------

/** 缴费凭证行（按订单汇总，供管理端核对金额与凭证图） */
export interface AdminVoucherRow {
  orderId: number
  status: number
  verification: number
  hourlyWage: number
  infoFee?: number | null
  depositImgTea?: string | null
  depositImgStu?: string | null
  infoFeeImg?: string | null
  infoFeeQr?: string | null
  createdAt?: string | null
}

/** GET /api/admin/users/{role}/{id}：基础资料全字段 + 统计 + 凭证 + 审核记录 */
export interface AdminUserArchive {
  role: 'student' | 'teacher'
  id: number
  /** 原始实体全字段（含手机号/资料图/时间表等，password 已置空） */
  profile: Record<string, unknown>
  stats: {
    orderTotal: number
    orderActive: number
    orderClosed: number
    infoFeeTotal: number
    /** 定金固定金额（双方各 100 元） */
    depositAmount: number
  }
  vouchers: AdminVoucherRow[]
  logs: RequestDTO[]
}

/** 用户完整档案：管理端一页查看某用户的全部数据 */
export async function getUserArchiveAdmin(role: 'student' | 'teacher', id: number): Promise<AdminUserArchive> {
  return http.get<AdminUserArchive>(`/api/admin/users/${role}/${id}`)
}

export async function listOrdersForUserAdmin(role: 'student' | 'teacher', id: number): Promise<AdminOrderRow[]> {
  const all = await listAllOrders()
  return all.filter((o) => (role === 'student' ? o.studentId === id : o.teacherId === id))
}

// ---------- 用户 ----------

/** GET /api/admin/teachers|students 原始实体（驼峰，无 role 字段；password 已置空） */
interface AdminUserRawDTO {
  id: number
  nickname: string
  phone: string
  age?: number | null
  gender?: string | null
  credit: number
  grade: number
  subject: number
  description?: string | null
  address?: string | null
  /** 0=寻找中 1=已停止/未激活 */
  status: number
  timeTable1: number
  timeTable2: number
  timeTable3: number
  timeTable4: number
  timeTable5: number
  timeTable6: number
  timeTable7: number
  qrcode?: string | null
  idcard?: string | null
  certificate?: string | null
}

/** 后台用户视图（含手机号等敏感字段；role/seeking/timeTables 由前端组装） */
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
  qrcode?: string
  idcard?: string
  certificate?: string
  timeTables: [number, number, number, number, number, number, number]
}

function dtoToAdminUser(role: 'student' | 'teacher', u: AdminUserRawDTO): AdminUserView {
  return {
    id: u.id,
    role,
    nickname: u.nickname,
    phone: u.phone,
    status: u.status,
    seeking: u.status === 0,
    grade: u.grade,
    subject: u.subject,
    credit: u.credit,
    age: u.age ?? undefined,
    gender: u.gender ?? undefined,
    description: u.description ?? undefined,
    address: u.address ?? undefined,
    qrcode: u.qrcode ?? undefined,
    idcard: u.idcard ?? undefined,
    certificate: u.certificate ?? undefined,
    timeTables: [u.timeTable1, u.timeTable2, u.timeTable3, u.timeTable4, u.timeTable5, u.timeTable6, u.timeTable7],
  }
}

export async function listAllUsers(): Promise<AdminUserView[]> {
  const [ts, ss] = await Promise.all([
    http.get<AdminUserRawDTO[]>('/api/admin/teachers'),
    http.get<AdminUserRawDTO[]>('/api/admin/students'),
  ])
  return [...ts.map((u) => dtoToAdminUser('teacher', u)), ...ss.map((u) => dtoToAdminUser('student', u))]
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

// ---------- 账号注销 / 恢复 / 彻底删除（清理脏数据） ----------

/** 注销账号（软删除，status=-2）：不可登录、不进匹配池，订单历史保留 */
export async function deactivateAccount(role: Role, id: number): Promise<void> {
  await http.post(`/api/admin/accounts/${role}/${id}/deactivate`)
}

/** 恢复已注销账号：status=0，重新进入寻找列表 */
export async function restoreAccount(role: Role, id: number): Promise<void> {
  await http.post(`/api/admin/accounts/${role}/${id}/restore`)
}

/** 彻底删除账号（物理删除，仅超管）：会连带删除其名下全部订单，不可恢复 */
export async function purgeAccount(role: Role, id: number): Promise<void> {
  await http.delete(`/api/admin/accounts/${role}/${id}`)
}

// ---------- 本地工具 ----------

function decodeSubjectsLocal(mask: number): string[] {
  return [...decodeSubjectsUtil(mask)]
}
