// ============================================================================
// 订单接口 —— 覆盖文档 status 0..12 全部状态机动作
// ============================================================================
import type { Order, Role, WeekTimeTables } from '@/types'
import { getDb } from '@/data/mock'
import * as M from '@/data/mockApi'

/** 填充订单 peer（对方的简要资料，供卡片展示） */
function fillPeer(o: Order, viewerRole: Role, viewerId: number): Order {
  const d = getDb()
  const peerRole: 'student' | 'teacher' = viewerRole === 'student' ? 'teacher' : 'student'
  const peerId = viewerRole === 'student' ? o.teacher_id : o.student_id
  const u = peerRole === 'student' ? d.students.find((s) => s.id === peerId) : d.teachers.find((s) => s.id === peerId)
  let visibleContact: Order['visibleContact'] = null
  // 缴费核验通过(status>=6)后才互见联系方式/地址
  if (u && o.status >= 6) {
    visibleContact = { phone: u.privateFields?.phone ?? '', address: u.address ?? null }
  }
  return {
    ...o,
    peer: u ? { id: u.id, role: u.role, nickname: u.nickname, grade: u.grade, subject: u.subject, credit: u.credit } : undefined,
    visibleContact,
  }
}

/** 我的进行中订单（含商议中+授课中；不含 status 12） */
export async function listMyOrders(role: Role, id: number, activeOnly = true): Promise<Order[]> {
  // TODO(real): return http.get('/orders/mine')
  let list = M.listOrdersByUser(role, id)
  if (activeOnly) list = list.filter((o) => o.status !== 12)
  return list.map((o) => fillPeer(o, role, id))
}

/** 订单详情（含全部字段，含联系方式可见控制由前端按 status 判断） */
export async function getOrder(orderId: number, role: Role): Promise<Order> {
  // TODO(real): return http.get(`/orders/${orderId}`)
  const o = M.getOrder(orderId)
  return fillPeer(o, role, role === 'student' ? o.student_id : o.teacher_id)
}

/** 创建订单：教师投递简历(resume→status0) / 学生免费试课(trial→status1) */
export async function createOrder(kind: 'resume' | 'trial', myRole: Role, myId: number, targetId: number, subject: number, hourlyWage: number): Promise<Order> {
  // TODO(real): return http.post('/orders', { kind, targetId, subject, hourlyWage })
  return M.createOrder(kind, myRole, myId, targetId, subject, hourlyWage)
}

/** 接受对方（status0 学生接受教师简历 / status1 教师接受学生试课）→2 */
export async function acceptInitial(orderId: number, role: Role): Promise<void> {
  // TODO(real): http.post(`/orders/${orderId}/accept`)
  M.acceptInitial(orderId, role)
}

/** 提交订单信息修改（会把我方置为改单待审 3/4） */
export async function submitOrderInfo(orderId: number, role: Role, patch: {
  subject: number
  hourly_wage: number
  description: string
  timeTables: WeekTimeTables
}): Promise<void> {
  // TODO(real): http.post(`/orders/${orderId}/info`)
  M.submitOrderInfo(orderId, role, patch)
}

/** 确认对方改单后的订单信息 →5 */
export async function confirmOrderInfo(orderId: number, role: Role): Promise<void> {
  M.confirmOrderInfo(orderId, role)
}

/** 取消订单 →12 */
export async function cancelOrder(orderId: number): Promise<void> {
  M.cancelOrder(orderId)
}

/** 上传缴费截图（deposit/img），登记管理员核验 */
export async function uploadPayment(orderId: number, role: Role, kind: 'teaDeposit' | 'stuDeposit' | 'infoFee', fileUrl: string): Promise<void> {
  // TODO(real): http.post(`/orders/${orderId}/pay`, { kind, file: formData })
  M.uploadPayment(orderId, role, kind, fileUrl)
}

/** 试课通过 */
export async function passTrial(orderId: number, role: Role): Promise<void> {
  M.passTrial(orderId, role)
}

/** 发起结单（→10/11） */
export async function requestClose(orderId: number, role: Role): Promise<void> {
  M.requestClose(orderId, role)
}

/** 同意结单（→12） */
export async function agreeClose(orderId: number, role: Role): Promise<void> {
  M.agreeClose(orderId, role)
}

/** 授课期申请毁约仲裁 */
export async function arbitrate(orderId: number, role: Role, text: string, evidence?: string[]): Promise<void> {
  M.arbitrate(orderId, role, text, evidence)
}
