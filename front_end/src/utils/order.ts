// 订单状态机（0..12）—— 严格对齐《项目设计说明文档.md》order.status
import type { Order } from '@/types'

export interface OrderStatusMeta {
  value: number
  /** 简短名称 */
  name: string
  /** 详细说明 */
  desc: string
  /** 所属业务阶段 */
  stage: 'resume' | 'confirm' | 'payment' | 'trial' | 'active' | 'closing' | 'closed' | 'dispute'
}

export const ORDER_STATUS: OrderStatusMeta[] = [
  { value: 0, name: '简历待确认', desc: '教师已投递简历，等待学生确认是否接受。', stage: 'resume' },
  { value: 1, name: '授课待确认', desc: '学生已发起免费试课邀请，等待教师确认。', stage: 'resume' },
  { value: 2, name: '信息待确认', desc: '双方已确认合作，进入订单明细确认程序。', stage: 'confirm' },
  { value: 3, name: '学生改单待审', desc: '学生修改了订单信息，等待教师审核。', stage: 'confirm' },
  { value: 4, name: '教师改单待审', desc: '教师修改了订单信息，等待学生审核。', stage: 'confirm' },
  { value: 5, name: '费用缴纳中', desc: '双方正在缴纳定金/信息费，等待管理员核验。', stage: 'payment' },
  { value: 6, name: '试课进行中', desc: '费用已核验，进入试课阶段，等待双方试课结果。', stage: 'trial' },
  { value: 7, name: '学生已过试课', desc: '学生试课通过并确定下单，等待教师确认。', stage: 'trial' },
  { value: 8, name: '教师已过试课', desc: '教师试课通过并确定下单，等待学生确认。', stage: 'trial' },
  { value: 9, name: '授课服务中', desc: '双方均通过试课，正式进入授课服务期。', stage: 'active' },
  { value: 10, name: '教师请求结单', desc: '教师发起结单，等待学生同意。', stage: 'closing' },
  { value: 11, name: '学生请求结单', desc: '学生发起结单，等待教师同意。', stage: 'closing' },
  { value: 12, name: '订单已结束', desc: '订单已结束（达成或中途取消）。', stage: 'closed' },
]

export function orderStatus(v: number): OrderStatusMeta {
  return ORDER_STATUS.find((s) => s.value === v) ?? { value: v, name: `未知(${v})`, desc: '', stage: 'closed' }
}

/** 是否「进行中」订单（不含已结束 status 12）。个人主页订单列表口径 */
export function isActiveOrder(o: Order): boolean {
  return o.status !== 12
}

/** 我侧当前能执行的操作名，交给页面决定按钮（按我扮演学生或教师） */
export interface MyActions {
  /** 主推进按钮文字，如「确认简历」「同意订单」 */
  primary?: string
  /** 可申请修改订单信息（仅处于信息确认互审阶段） */
  canEditInfo: boolean
  /** 需我缴费（作为缴纳方且处于该缴费子项） */
  needDeposit: boolean
  /** 已缴我方定金 */
  myDepositPaid: boolean
  /** 我已缴纳信息费（仅教师） */
  infoFeePaid: boolean
  /** 可上传缴费截图 */
  canPay: boolean
  /** 可点击试课通过 */
  canPassTrial: boolean
  /** 可发起结单 */
  canClose: boolean
  /** 是否在授课期（status 9），可申请仲裁 */
  canArbitrate: boolean
  /** 联系方式是否已互见（缴费核验通过后） */
  contactVisible: boolean
  /** 是否已结束 */
  closed: boolean
  /** 可取消/打回（回到 12） */
  canCancel: boolean
}

/**
 * 计算在给定角色视角下订单的可执行操作集。
 * @param o 订单
 * @param myRole 'student' | 'teacher'
 */
export function myActions(o: Order, myRole: 'student' | 'teacher'): MyActions {
  const s = o.status
  const meIsStudent = myRole === 'student'
  const ver = o.verification
  // verification 低3位：bit0 教师定金 bit1 学生定金 bit2 教师信息费
  const teaDeposit = (ver & 1) === 1
  const stuDeposit = (ver & 2) === 2
  const infoFee = (ver & 4) === 4

  const myDepositPaid = meIsStudent ? stuDeposit : teaDeposit
  const infoFeePaid = infoFee

  // 默认
  const base: MyActions = {
    canEditInfo: false,
    needDeposit: false,
    myDepositPaid,
    infoFeePaid,
    canPay: false,
    canPassTrial: false,
    canClose: false,
    canArbitrate: false,
    contactVisible: s >= 6, // 缴费核验完成(status6)后可见联系方式
    closed: s === 12,
    canCancel: false,
  }

  switch (s) {
    case 0: // 教师投递，等学生
      if (meIsStudent) base.primary = '确认接受简历'
      else base.primary = '等待学生确认'
      break
    case 1: // 学生发起，等教师
      if (!meIsStudent) base.primary = '接受授课'
      else base.primary = '等待教师确认'
      break
    case 2: // 双方确认，进信息确认
      base.canEditInfo = true
      base.canCancel = true
      break
    case 3: // 学生改了单等教师
      if (!meIsStudent) {
        base.primary = '确认订单信息'
        base.canEditInfo = true // 教师可再改
        base.canCancel = true
      } else base.primary = '等待教师审核'
      break
    case 4: // 教师改了单等学生
      if (meIsStudent) {
        base.primary = '确认订单信息'
        base.canEditInfo = true
        base.canCancel = true
      } else base.primary = '等待学生审核'
      break
    case 5: // 缴费中
      base.needDeposit = true
      base.canPay = !myDepositPaid || (!meIsStudent && !infoFeePaid)
      base.canCancel = true
      break
    case 6: // 试课
      base.canPassTrial = true
      break
    case 7: // 学生过试课，等教师
      if (!meIsStudent) base.primary = '确认试课通过'
      else base.primary = '等待教师确认试课'
      break
    case 8: // 教师过试课，等学生
      if (meIsStudent) base.primary = '确认试课通过'
      else base.primary = '等待学生确认试课'
      break
    case 9: // 授课中
      base.canClose = true
      base.canArbitrate = true
      break
    case 10: // 教师请求结单
      if (meIsStudent) base.primary = '同意结单'
      else base.primary = '等待学生同意结单'
      break
    case 11: // 学生请求结单
      if (!meIsStudent) base.primary = '同意结单'
      else base.primary = '等待教师同意结单'
      break
    default:
      break
  }
  return base
}
