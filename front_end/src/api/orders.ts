// ============================================================================
// 订单接口（真实后端，8083）
// 文档第 3 节：状态机 0..12 + 订单全流程动作
// ============================================================================
import http from './http'
import type { Order, Role, WeekTimeTables } from '@/types'

/** 后端返回的订单 DTO（含双方可见联系方式、信用分等） */
interface OrderDTO {
  id: number
  student_id: number
  teacher_id: number
  subject: number
  hourlyWage: number
  description?: string
  status: number
  verification: number // 低3位：师定金/生定金/信息费
  infoFee?: number
  infoFeeQr?: string | null
  teaDepositImg?: string | null
  stuDepositImg?: string | null
  infoFeeImg?: string | null
  timeTable1: number
  timeTable2: number
  timeTable3: number
  timeTable4: number
  timeTable5: number
  timeTable6: number
  timeTable7: number
  createdAt: string
  updatedAt?: string
  // 双方补充信息
  studentName?: string
  teacherName?: string
  studentCredit?: number
  teacherCredit?: number
  studentGrade?: number
  teacherGrade?: number
  studentSubject?: number
  teacherSubject?: number
  // 联系方式（仅 status>=6 时下发）
  phone?: string
  address?: string
}

function ttFrom(o: OrderDTO): WeekTimeTables {
  return [o.timeTable1, o.timeTable2, o.timeTable3, o.timeTable4, o.timeTable5, o.timeTable6, o.timeTable7]
}

function dtoToOrder(o: OrderDTO, viewerRole: Role | null): Order {
  // peer：当前观众视角下的对方
  const peerRole: 'student' | 'teacher' | null =
    viewerRole === 'student' ? 'teacher' :
    viewerRole === 'teacher' ? 'student' :
    null
  const peer = peerRole === 'student'
    ? {
        id: o.student_id,
        role: 'student' as const,
        nickname: o.studentName ?? '',
        grade: o.studentGrade ?? 0,
        subject: o.studentSubject ?? 0,
        credit: o.studentCredit ?? 0,
      }
    : peerRole === 'teacher'
    ? {
        id: o.teacher_id,
        role: 'teacher' as const,
        nickname: o.teacherName ?? '',
        grade: o.teacherGrade ?? 0,
        subject: o.teacherSubject ?? 0,
        credit: o.teacherCredit ?? 0,
      }
    : undefined
  return {
    id: o.id,
    student_id: o.student_id,
    teacher_id: o.teacher_id,
    subject: o.subject,
    hourlyWage: o.hourlyWage,
    description: o.description ?? '',
    status: o.status,
    verification: o.verification,
    infoFee: o.infoFee ?? 0,
    infoFeeQr: o.infoFeeQr ?? undefined,
    teaDepositImg: o.teaDepositImg ?? undefined,
    stuDepositImg: o.stuDepositImg ?? undefined,
    infoFeeImg: o.infoFeeImg ?? undefined,
    timeTables: ttFrom(o),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    peer,
    // status>=6 才下发 phone/address
    visibleContact:
      o.status >= 6 && o.phone
        ? { phone: o.phone, address: o.address ?? null }
        : null,
  }
}

/** 我的订单列表 */
export async function listMyOrders(
  role: Role,
  activeOnly = true
): Promise<Order[]> {
  const arr = await http.get<OrderDTO[]>('/api/order/mine', {
    params: { scope: activeOnly ? 'active' : 'all' },
  })
  return arr.map((o) => dtoToOrder(o, role))
}

/** 订单详情 */
export async function getOrder(orderId: number, viewerRole: Role | null): Promise<Order> {
  const o = await http.get<OrderDTO>(`/api/order/${orderId}`)
  return dtoToOrder(o, viewerRole)
}

/** 发起订单：教师→学生投递简历(resume→0) / 学生→教师免费试课(trial→1) */
export async function createOrder(
  targetId: number,
  captchaToken: string
): Promise<Order> {
  const o = await http.post<OrderDTO>('/api/order/apply', { targetId, captchaToken })
  return dtoToOrder(o, null)
}

/** 接受（status 0 学生确认 →2 / status 1 教师确认 →2） */
export async function acceptInitial(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/confirm`)
}

/** 拒绝（0 学生拒 / 1 教师拒 → 物理删除） */
export async function rejectInitial(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/reject`)
}

/** 撤回：发起方在 0/1 阶段撤回 → 物理删除；2-8 任一方取消 →12 */
export async function cancelOrder(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/cancel`)
}

/** 提交订单明细 */
export async function submitOrderInfo(
  orderId: number,
  patch: {
    subject: number
    hourlyWage: number
    description: string
    timeTables: WeekTimeTables
  }
): Promise<void> {
  await http.put(`/api/order/${orderId}/detail`, {
    subject: patch.subject,
    hourlyWage: patch.hourlyWage,
    description: patch.description,
    timeTable1: patch.timeTables[0],
    timeTable2: patch.timeTables[1],
    timeTable3: patch.timeTables[2],
    timeTable4: patch.timeTables[3],
    timeTable5: patch.timeTables[4],
    timeTable6: patch.timeTables[5],
    timeTable7: patch.timeTables[6],
  })
}

/** 确认对方明细 → 5 */
export async function confirmOrderInfo(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/confirm-detail`)
}

/** 上传缴费截图（先调 /api/upload 拿 url，再 POST payment） */
export async function uploadPayment(
  orderId: number,
  type: 'depositTea' | 'depositStu' | 'infoFee',
  imageUrl: string
): Promise<void> {
  await http.post(`/api/order/${orderId}/payment`, { type, imageUrl })
}

/** 试课通过 */
export async function passTrial(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/trial-pass`)
}

/** 发起结单（→10/11） */
export async function requestClose(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/settle`)
}

/** 同意结单（→12） */
export async function agreeClose(orderId: number): Promise<void> {
  await http.post(`/api/order/${orderId}/settle`)
}

/** 申请仲裁 */
export async function arbitrate(
  orderId: number,
  text: string,
  images: string[]
): Promise<void> {
  await http.post(`/api/order/${orderId}/arbitrate`, { text, images })
}