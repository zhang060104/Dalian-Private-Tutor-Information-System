// ============================================================================
// mockApi —— 伪后端「写操作」全集
// 供 src/api/* 调用；将来切真实后端时此文件废弃，api 内部改走 http.ts。
// 说明：状态全部落在 mock.ts 的 localStorage 内存库，刷新后仍保留，
//       便于演示完整的订单/审核状态机。
// ============================================================================
import { getDb, persist } from './mock'
import type { StoredUser, StoredStudent, StoredTeacher } from './mock'
import type {
  Order, Profile, RegisterPayload, RequestLog, RequestType, Role,
  Student, Teacher, WeekTimeTables,
} from '@/types'

const now = () => new Date().toISOString()
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

// ---------------------- 工具：从库里取正式用户 ----------------------
export function rawUser(role: Role, id: number): StoredUser | undefined {
  const d = getDb()
  return (role === 'student' ? d.students : d.teachers).find((u) => u.id === id)
}

/** 把存储用户裁剪为「对外安全 Profile」（isSelf/phoneVisible 由调用方按上下文补） */
export function toProfile(u: StoredUser, isSelf = false): Profile {
  const { password: _pw, id, role, nickname, age, gender, credit, grade, subject, description, status, address, location } = u
  return {
    id, role, nickname, age: age ?? null, gender: gender ?? null, credit, grade, subject,
    description, status: (status === 1 ? 1 : 0) as 0 | 1,
    timeTables: clone(u.timeTables),
    address: address ?? null, location: location ?? null,
    isSelf, phoneVisible: false,
  }
}

/** 供管理端查看的私密字段（不含 password） */
export function toPrivate(u: StoredUser) {
  const { id, nickname, phone, password: _pw, role } = u
  const priv = u.role === 'student' ? u.privateFields : u.privateFields
  const extra = u.role === 'teacher' ? { certificate: (u as Teacher).privateFields?.certificate } : {}
  return { id, role, nickname, phone, ...(priv ?? {}), ...extra }
}

// ---------------------- 注册入驻 ----------------------
/** 提交注册：写入 pending + 生成 type0/1 requestLog 待管理员审核 */
export function register(p: RegisterPayload & { role: 'student' | 'teacher' }): { userId: number; submitted: boolean } {
  const d = getDb()
  const id = d.seq.user++
  const reqId = d.seq.request++
  const phone = p.phone
  // 查重
  const dup = [...d.students, ...d.teachers].some((u) => u.phone === phone)
  if (dup) throw new Error('该手机号已注册')

  const base = {
    id, nickname: p.nickname, password: p.password, phone, age: p.age ?? null,
    gender: p.gender ?? null, credit: 100, grade: p.grade ?? 0, subject: p.subject ?? 0,
    description: p.description ?? '', status: 0 as const, address: p.address ?? null,
    timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables, location: null,
    phoneVisible: false, isSelf: false,
  }
  const pendingUser = p.role === 'teacher'
    ? { ...base, role: 'teacher' as const, privateFields: { phone, QRcode: p.QRcode, IDcard: p.IDcard, certificate: p.certificate ?? '' } }
    : { ...base, role: 'student' as const, privateFields: { phone, QRcode: p.QRcode, IDcard: p.IDcard } }
  d.pendingUsers.push(pendingUser as StoredUser)

  const type: RequestType = p.role === 'teacher' ? 0 : 1
  const log: RequestLog = {
    id: reqId, type, tarID: id, admin_id: -1, createdAt: now(),
    json: JSON.stringify({ action: 'register', role: p.role, payload: p }),
  }
  d.requests.push(log)
  persist()
  return { userId: id, submitted: true }
}

/** 从 RegisterPayload 构造正式库用户记录 */
export function buildUserFromPayload(p: RegisterPayload, id: number): StoredUser {
  const base = {
    id, nickname: p.nickname, password: p.password, phone: p.phone, age: p.age ?? null,
    gender: p.gender ?? null, credit: 100, grade: p.grade ?? 0, subject: p.subject ?? 0,
    description: p.description ?? '', status: 0 as const, address: p.address ?? null,
    timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables, location: null,
    phoneVisible: false, isSelf: false, updatedAt: now(),
  }
  if (p.role === 'teacher') {
    return { ...base, role: 'teacher' as const, privateFields: { phone: p.phone, QRcode: p.QRcode, IDcard: p.IDcard, certificate: p.certificate ?? '' } }
  }
  return { ...base, role: 'student' as const, privateFields: { phone: p.phone, QRcode: p.QRcode, IDcard: p.IDcard } }
}

/** 管理员以 requestId 驱动处理 type0/1 待办（注册通过 / 信息修改通过 / 打回） */
export function handleUserRequest(requestId: number, adminId: number, decision: 'approve' | 'reject', manualPatch?: Partial<Profile>): void {
  const d = getDb()
  const req = d.requests.find((r) => r.id === requestId)
  if (!req || (req.type !== 0 && req.type !== 1)) return
  const parsed = (safeParse(req.json) ?? {}) as {
    action?: 'register' | 'edit-profile'
    role?: Role
    payload?: RegisterPayload
    patch?: Partial<Profile>
  }
  if (parsed.action === 'register' && parsed.role && parsed.payload) {
    if (decision === 'approve') {
      const user = buildUserFromPayload(parsed.payload, req.tarID)
      if (manualPatch) Object.assign(user, manualPatch, { privateFields: user.privateFields })
      if (parsed.role === 'student') d.students.push(user as StoredStudent)
      else d.teachers.push(user as StoredTeacher)
    }
    // 无论通过/打回，pendingUsers 中该注册候选不再保留
    d.pendingUsers = d.pendingUsers.filter((u) => u.id !== req.tarID)
  } else if (parsed.action === 'edit-profile' && parsed.role) {
    if (decision === 'approve') {
      const u = rawUser(parsed.role, req.tarID)
      if (u) {
        const patch = manualPatch ?? parsed.patch ?? {}
        const merged = { ...u, ...patch, timeTables: patch.timeTables ? clone(patch.timeTables) : u.timeTables }
        const arr = parsed.role === 'student' ? d.students : d.teachers
        const i = arr.findIndex((x) => x.id === u.id)
        if (i >= 0) arr[i] = merged as never
      }
    }
  }
  d.requests = d.requests.filter((r) => r.id !== requestId)
  persist()
}

export function rejectRequest(requestId: number): void {
  const d = getDb()
  const req = d.requests.find((r) => r.id === requestId)
  if (!req) return
  const parsed = safeParse(req.json) as { action?: string } | null
  if (parsed?.action === 'register') {
    d.pendingUsers = d.pendingUsers.filter((u) => u.id !== req.tarID)
  }
  d.requests = d.requests.filter((r) => r.id !== requestId)
  persist()
}

// ---------------------- 信息修改审核（type0/1） ----------------------
/** 提交我的资料修改 → 生成 type0/1 requestLog 待管理员审核 */
export function submitProfileChange(role: Role, userId: number, patch: Partial<Profile>): void {
  const d = getDb()
  const u = rawUser(role, userId)
  if (!u) throw new Error('用户不存在')
  const reqId = d.seq.request++
  const type: RequestType = role === 'teacher' ? 0 : 1
  const log: RequestLog = {
    id: reqId, type, tarID: userId, admin_id: -1, createdAt: now(),
    json: JSON.stringify({ action: 'edit-profile', role, patch }),
  }
  d.requests.push(log)
  persist()
}

// ---------------------- 订单创建 / 状态流转 ----------------------
/** 投递简历(教师→学生) status0 或 免费试课(学生→教师) status1 创建订单 */
export function createOrder(kind: 'resume' | 'trial', initiatorRole: Role, initiatorId: number, targetUserId: number, subject: number, hourlyWage: number): Order {
  const d = getDb()
  const oid = d.seq.order++
  const studentId = initiatorRole === 'student' ? initiatorId : targetUserId
  const teacherId = initiatorRole === 'teacher' ? initiatorId : targetUserId
  const order: Order = {
    id: oid, student_id: studentId, teacher_id: teacherId,
    subject, hourly_wage: hourlyWage, infoFee: 0,
    description: kind === 'resume' ? '教师投递的授课意向' : '学生发起的免费试课邀请',
    status: kind === 'resume' ? 0 : 1,
    verification: 0, depositImgTea: '', depositImgStu: '', infoFeeImg: '', infoFeeQR: '',
    timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables,
    createdAt: now(),
  }
  d.orders.push(order)
  persist()
  return clone(order)
}

/** 获得某订单（含 peer 填充） */
export function getOrder(id: number): Order {
  const o = getDb().orders.find((x) => x.id === id)
  if (!o) throw new Error('订单不存在')
  return clone(o)
}

export function listOrdersByUser(role: Role, userId: number): Order[] {
  const d = getDb()
  return d.orders
    .filter((o) => (role === 'student' ? o.student_id === userId : o.teacher_id === userId))
    .map((o) => clone(o))
}

/** 通用状态机操作（供确认/同意/试课/结单等调用），校验状态合法 */
export function setOrderStatus(orderId: number, from: number[], to: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  if (!from.includes(o.status)) throw new Error('订单当前状态不允许该操作')
  o.status = to
  o.updatedAt = now()
  persist()
}

/** 提交订单信息修改（status 2→3学生 / 2→4教师），或互审期间再改 */
export function submitOrderInfo(orderId: number, role: Role, patch: Partial<Pick<Order, 'subject' | 'hourly_wage' | 'description' | 'timeTables'>>): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  // 合并
  if (patch.subject !== undefined) o.subject = patch.subject
  if (patch.hourly_wage !== undefined) o.hourly_wage = patch.hourly_wage
  if (patch.description !== undefined) o.description = patch.description
  if (patch.timeTables) o.timeTables = clone(patch.timeTables)
  // 状态机：把我方角色置为改单后待审
  if (role === 'student') o.status = 3
  else o.status = 4
  o.updatedAt = now()
  persist()
}

/** 确认订单信息（status3 教师确认→5；status4 学生确认→5；status2 双方都确认后也到5） */
export function confirmOrderInfo(orderId: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  if (o.status === 3 && role === 'teacher') o.status = 5
  else if (o.status === 4 && role === 'student') o.status = 5
  else throw new Error('当前无需你确认订单信息')
  o.updatedAt = now()
  persist()
}

/** 确认接受简历/授课（status 0 学生接受→2；status1 教师接受→2） */
export function acceptInitial(orderId: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  if (o.status === 0 && role === 'student') o.status = 2
  else if (o.status === 1 && role === 'teacher') o.status = 2
  else throw new Error('当前状态无法接受')
  o.updatedAt = now()
  persist()
}

/** 取消订单 → 12 */
export function cancelOrder(orderId: number): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  o.status = 12
  o.updatedAt = now()
  persist()
}

/** 上传缴费截图：给对应 verification 位 + 记录截图，并登记管理员核验 requestLog(type2-4) */
export function uploadPayment(orderId: number, role: Role, kind: 'teaDeposit' | 'stuDeposit' | 'infoFee', img: string): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  // 先置截图占位（mock 用路径），并设 verification 对应位为已缴（简化：上传即登记待核验）
  // 按文档，管理员核验后才置位；此处上传只记截图 + 加 requestLog。
  if (kind === 'teaDeposit') o.depositImgTea = img
  if (kind === 'stuDeposit') o.depositImgStu = img
  if (kind === 'infoFee') o.infoFeeImg = img
  const typeMap = { teaDeposit: 2, stuDeposit: 3, infoFee: 4 } as const
  const req: RequestLog = {
    id: d.seq.request++, type: typeMap[kind], tarID: orderId, admin_id: -1, createdAt: now(),
    json: JSON.stringify({ action: 'payment', kind, img, role, amount: kind === 'infoFee' ? o.infoFee : o.hourly_wage }),
  }
  d.requests.push(req)
  o.updatedAt = now()
  persist()
}

/** 管理员核验缴费通过：置 verification 位；当三笔(教师定金/学生定金/教师信息费)齐了 → status 5→6 */
export function approvePayment(orderId: number, kind: 'teaDeposit' | 'stuDeposit' | 'infoFee', requestId: number): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) return
  const bit = kind === 'teaDeposit' ? 1 : kind === 'stuDeposit' ? 2 : 4
  o.verification |= bit
  d.requests = d.requests.filter((r) => r.id !== requestId)
  if ((o.verification & 7) === 7) o.status = 6
  o.updatedAt = now()
  persist()
}

/** 管理员核验缴费打回（去掉截图与待办，教师重新上传） */
export function rejectPayment(requestId: number): void {
  const d = getDb()
  const req = d.requests.find((r) => r.id === requestId)
  if (!req) return
  const parsed = safeParse(req.json) as { kind?: string } | null
  const o = d.orders.find((x) => x.id === req.tarID)
  if (o && parsed) {
    const k = parsed.kind
    if (k === 'teaDeposit') o.depositImgTea = ''
    if (k === 'stuDeposit') o.depositImgStu = ''
    if (k === 'infoFee') o.infoFeeImg = ''
  }
  d.requests = d.requests.filter((r) => r.id !== requestId)
  persist()
}

/** 试课通过：status6→(单方)7/8；status7 教师再点→9；status8 学生再点→9 */
export function passTrial(orderId: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  const isStu = role === 'student'
  if (o.status === 6) o.status = isStu ? 7 : 8
  else if (o.status === 7 && !isStu) o.status = 9
  else if (o.status === 8 && isStu) o.status = 9
  else throw new Error('当前状态无法操作试课')
  o.updatedAt = now()
  persist()
}

/** 发起结单：status9 → 10(教师) / 11(学生) */
export function requestClose(orderId: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  o.status = role === 'teacher' ? 10 : 11
  o.updatedAt = now()
  persist()
}

/** 同意结单：status10 学生同意→12；status11 教师同意→12 */
export function agreeClose(orderId: number, role: Role): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o) throw new Error('订单不存在')
  if (o.status === 10 && role === 'student') o.status = 12
  else if (o.status === 11 && role === 'teacher') o.status = 12
  else throw new Error('当前状态无需你同意结单')
  o.updatedAt = now()
  persist()
}

/** 授课期(9)申请毁约仲裁 → 生成 type5 requestLog */
export function arbitrate(orderId: number, role: Role, text: string, evidence?: string[]): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 9) throw new Error('仅授课服务期间可申请仲裁')
  const req: RequestLog = {
    id: d.seq.request++, type: 5, tarID: orderId, admin_id: -1, createdAt: now(),
    json: JSON.stringify({ action: 'arbitrate', role, text, evidence: evidence ?? [] }),
  }
  d.requests.push(req)
  persist()
}

/** 管理端解决仲裁：将订单置为 12（结案），可扣信用分 */
export function resolveArbitration(orderId: number, requestId: number, verdict: string, penaltyRole?: Role, penaltyUserId?: number, creditDelta?: number): void {
  const d = getDb()
  const o = d.orders.find((x) => x.id === orderId)
  if (o) {
    o.status = 12
    o.updatedAt = now()
  }
  d.requests = d.requests.filter((r) => r.id !== requestId)
  if (penaltyRole && penaltyUserId && creditDelta) adjustCredit(penaltyRole, penaltyUserId, creditDelta)
  persist()
}

// ---------------------- 信用分 ----------------------
export function adjustCredit(role: Role, userId: number, delta: number): void {
  const d = getDb()
  const arr = role === 'student' ? d.students : d.teachers
  const u = arr.find((x) => x.id === userId)
  if (u) {
    u.credit = Math.max(0, (u.credit ?? 100) + delta)
    persist()
  }
}

// ---------------------- 切换寻找状态 status 0/1 ----------------------
export function toggleSeeking(role: Role, userId: number): number {
  const d = getDb()
  const arr = role === 'student' ? d.students : d.teachers
  const u = arr.find((x) => x.id === userId)
  if (!u) throw new Error('用户不存在')
  u.status = u.status === 1 ? 0 : 1
  persist()
  return u.status
}

// ---------------------- 管理员管理 ----------------------
export function createAdmin(nickname: string, phone: string, password: string): void {
  const d = getDb()
  d.admins.push({ id: d.seq.user++, nickname, phone, password })
  persist()
}
export function deleteAdmin(id: number): void {
  const d = getDb()
  if (id === 0) throw new Error('ID 为 0 的超级管理员不可删除')
  d.admins = d.admins.filter((a) => a.id !== id)
  persist()
}
export function listAdmins(): { id: number; nickname: string; phone: string }[] {
  return getDb().admins.map(({ id, nickname, phone }) => ({ id, nickname, phone }))
}
