// ============================================================================
// 类型定义 —— 与后端契约对齐
// 编码：
//   grade      0..17     0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业
//   subject    int 低24位 位掩码
//   timeTableN int 低24位 位掩码
//   status     0..12 订单状态机；0/1 用户状态（寻找/停止）
//   credit     信用分，默认 100，范围 0-1000
// ============================================================================

/** 性别 */
export type Gender = '男' | '女'

/** 角色 */
export type Role = 'student' | 'teacher' | 'admin'

/** 用户公开资料 */
export interface Profile {
  id: number
  role: Role
  nickname: string
  age?: number | null
  gender?: Gender | null
  grade: number
  subject: number
  description: string
  /** 0 正在寻找 · 1 已停止 */
  status: number
  seeking: boolean
  credit: number
  timeTables: WeekTimeTables
  address?: string | null
  location?: { x: number; y: number } | null
  /** 本人视角：用于个人主页给修改入口 */
  isSelf: boolean
  /** 联系方式（仅本人） */
  phoneVisible: boolean
  /** 是否超管 */
  isSuperAdmin?: boolean
  updatedAt?: string
}

/** 对订单内时间表位掩码 */
export type WeekTimeTables = [number, number, number, number, number, number, number]

/** 订单（status 状态机 0..12） */
export interface Order {
  id: number
  student_id: number
  teacher_id: number
  subject: number
  /** 时薪（元/小时） */
  hourlyWage: number
  /** 信息费（第一周工资总额） */
  infoFee: number
  description: string
  status: number
  /** verification 低3位：bit0=教师定金 bit1=学生定金 bit2=教师信息费 */
  verification: number
  teaDepositImg?: string
  stuDepositImg?: string
  infoFeeImg?: string
  infoFeeQr?: string
  timeTables: WeekTimeTables
  /** 概要视图填充的对方信息（双方/管理员视角填充） */
  peer?: {
    id: number
    role: 'student' | 'teacher'
    nickname: string
    grade: number
    subject: number
    credit: number
  }
  /** status>=6 后可见的对方联系方式 */
  visibleContact?: { phone: string; address?: string | null } | null
  createdAt: string
  updatedAt?: string
}

/** requestLog 待审/待核验项目 */
export type RequestType = 0 | 1 | 2 | 3 | 4 | 5

export interface RequestLog {
  id: number
  type: RequestType
  /** type0/1→用户id；type2-5→订单id */
  tarID: number
  /** 提交时承载的 json */
  json: string
  admin_id: number
  createdAt: string
}