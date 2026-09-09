// ============================================================================
// 类型定义 —— 严格对齐《项目设计说明文档.md》5 张表结构
// 数据编码约定（与后端/文档一致）：
//   grade      0..17     0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业
//   subject    int 低24位 位掩码，1=需要/可授该科目（24 科目顺序见 utils/subject.ts）
//   timeTableN int 低24位 位掩码，1=该日对应整点小时空余（timeTable1=周一…7=周日）
//   status     (student/teacher) 0 正在寻找 1 已停止
//   credit     信用分，新用户默认 100
// ============================================================================

/** 性别 */
export type Gender = '男' | '女'

/** 角色 */
export type Role = 'student' | 'teacher' | 'admin'

/** 用户对外可见的安全资料（不含 password / 敏感文件全路径） */
export interface Profile {
  id: number
  role: Role
  nickname: string
  /** 对外是否可见联系方式，受订单「缴费核验通过」控制 */
  phoneVisible: boolean
  age?: number | null
  gender?: Gender | null
  credit: number
  grade: number
  subject: number
  description: string
  /** 0 正在寻找 · 1 已停止 */
  status: 0 | 1
  /** timeTable1..7，周一~周日 */
  timeTables: [number, number, number, number, number, number, number]
  address?: string | null
  /** 坐标预留（SRID 4326 / 高德），本期不实现导航，隐藏字段 */
  location?: { x: number; y: number } | null
  /** 是否本人查看（用于个人主页给修改入口） */
  isSelf: boolean
  updatedAt?: string
}

/** 学生 */
export interface Student extends Profile {
  role: 'student'
  /** 学生需要家教的科目需求已并入 subject */
  // 以下为注册/审核必需但对外不展示的字段，仅本人或管理员可见
  privateFields?: StudentPrivate
}
export interface StudentPrivate {
  phone: string
  /** 收款码图（服务器目录地址） */
  QRcode: string
  /** 身份证人像面图（服务器目录地址） */
  IDcard: string
}

/** 教师 */
export interface Teacher extends Profile {
  role: 'teacher'
  privateFields?: TeacherPrivate
}
export interface TeacherPrivate {
  phone: string
  QRcode: string
  IDcard: string
  /** 教师资格证（服务器目录地址） */
  certificate?: string
}

/** 订单（design doc: order 表） */
export interface Order {
  id: number
  student_id: number
  teacher_id: number
  /** 授课科目（24 位掩码，约定为单选语义仍存 int） */
  subject: number
  /** 时薪（元/小时） */
  hourly_wage: number
  /** 信息费（第一周工资总额），仅收费阶段展示给教师 */
  infoFee: number
  description: string
  /** 状态机 0..12，见 utils/order.ts */
  status: number
  /** verification 低 3 位：bit0=教师定金 bit1=学生定金 bit2=教师信息费（1 已缴） */
  verification: number
  depositImgTea: string
  depositImgStu: string
  infoFeeImg: string
  /** 管理员上传的信息费收款码 */
  infoFeeQR: string
  /** 授课时间表（周一~周日） */
  timeTables: [number, number, number, number, number, number, number]
  /** 概要视图填充的对方信息 */
  peer?: {
    id: number
    role: Role
    nickname: string
    grade: number
    subject: number
    credit: number
  }
  /** 缴费核验通过(status≥6)后可见的对方联系方式 */
  visibleContact?: { phone: string; address?: string | null } | null
  createdAt: string
  updatedAt?: string
}

/** 管理员 */
export interface Admin {
  id: number
  nickname: string
  phone: string
}

/** requestLog 待审/待核验项目 */
export type RequestType = 0 | 1 | 2 | 3 | 4 | 5

export interface RequestLog {
  id: number
  /** 0教师信息修改 1学生信息修改 2教师定金核验 3学生定金核验 4教师信息费核验 5毁约仲裁 */
  type: RequestType
  /** type0/1→用户id；type2-5→订单id */
  tarID: number
  /** 依 type 承载：修改后资料 / 付款截图地址 / 仲裁文本+图片 */
  json: string
  /** 处理管理员 id，-1=无人处理 */
  admin_id: number
  createdAt: string
}

/** 注册入驻所需（文档业务逻辑15） */
export interface RegisterPayload {
  role: 'student' | 'teacher'
  nickname: string
  password: string
  phone: string
  QRcode: string
  IDcard: string
  certificate?: string
  grade?: number
  subject?: number
  age?: number | null
  gender?: Gender | null
  description?: string
  address?: string | null
}

/** 登录凭证 */
export interface LoginPayload {
  role: 'student' | 'teacher' | 'admin'
  phone: string
  password: string
}

/** 登录结果 */
export interface LoginResult {
  token: string
  role: Role
  id: number
  nickname: string
}

/** 对订单内时间表位掩码的展示辅助 */
export type WeekTimeTables = [number, number, number, number, number, number, number]
