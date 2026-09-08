/**
 * 大连私人家教中心 · 前端类型定义
 */

/** 中心联系方式（集中维护，便于替换真实信息） */
export const CENTER_CONTACT = {
  name: '大连私人家教中心',
  slogan: '严选师资 · 双向选择 · 定金保障',
  phone: '0411-8888-6666',
  serviceTime: '周一至周日 8:00 - 21:00',
  email: 'contact@tutor-dalian.example.com',
  address: '大连市（各区分中心，详情电话咨询）',
  wechat: 'dalian-tutor',
}

/* ==================== 角色账号体系（老师 / 学生 / 管理员） ==================== */

/** 系统角色 */
export type Role = 'admin' | 'teacher' | 'student'

/** 账号基类（登录标识为 phone，数据库无 username 字段） */
export interface AccountBase {
  id?: number
  password?: string
  role: Role
  name: string
  phone: string
  createdAt: string
}

/**
 * 一周空余时间：7 个 int（下标 0=周一 … 6=周日）
 * 每个 int 解码为二进制后取**低 24 位**为有效数据，第 h 位 = 1 表示 h:00–h+1:00 空闲。
 * （1=有空 / 0=没空；由前端 utils/availability.ts 编解码，参考科目位掩码同一思路）
 */
export type WeekAvailability = number[]

/** 老师账号（入驻资料） */
export interface TeacherAccount extends AccountBase {
  role: 'teacher'
  gender: '男' | '女'
  /** 主教科目：SUBJECT_OPTIONS 下标位掩码（bit i = SUBJECT_OPTIONS[i] 选中），由前端编解码 */
  subjects: number
  /** 可授年级：单一数值编码（0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业） */
  grade: number
  /** 信用分（数据库 credit，订单成交/评价累积；页面以分数直观展示） */
  credit: number
  intro: string
  /** 一周空余时间（7 个 int，见 WeekAvailability） */
  availability: WeekAvailability
}

/** 学生账号（入驻资料） */
export interface StudentAccount extends AccountBase {
  role: 'student'
  gender: '男' | '女'
  /** 就读/在找老师对应的年级：单一数值编码（0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业） */
  grade: number
  /** 需要辅导的科目：SUBJECT_OPTIONS 下标位掩码（单科即单 bit 置位） */
  subjects: number
  /** 信用分（数据库 credit，订单成交/评价累积） */
  credit: number
  note?: string
  /** 一周空余时间（7 个 int，见 WeekAvailability） */
  availability: WeekAvailability
}

/** 管理员账号 */
export interface AdminAccount extends AccountBase {
  role: 'admin'
}

export type AnyAccount = AdminAccount | TeacherAccount | StudentAccount

/** 师生双向选择关系（老师选学生 / 学生选老师），以 phone 作为唯一标识 */
export interface MatchRelation {
  teacherPhone: string
  studentPhone: string
  /** 发起方：teacher=老师选择了学生；student=学生选择了老师 */
  by: 'teacher' | 'student'
  createdAt: string
}

/* ==================== 个人资料修改审核 ==================== */

/** 单个字段的变更对比（面向管理端审核展示） */
export interface ProfileReviewField {
  /** 字段中文名，如「姓名」「主教科目」 */
  label: string
  /** 审核前（当前生效）的值文本 */
  old: string
  /** 申请修改后的值文本 */
  next: string
}

/**
 * 个人资料修改申请（老师/学生提交 → 管理员审核）
 *
 * 审核通过前：users 中仍是旧资料（对外展示不受影响，即"审核期间沿用旧信息"）；
 * 通过后由管理员将 next 合并进对应用户；驳回/撤销则直接移除本条申请。
 */
export interface ProfileReview {
  id: number
  /** 申请人登录标识（手机号），数据库无 username 字段 */
  phone: string
  role: 'teacher' | 'student'
  /** 提交人姓名（提交时快照，便于后台展示） */
  name: string
  submittedAt: string
  /** 字段级变更清单（只含有变化的字段） */
  fields: ProfileReviewField[]
}

/** 角色中文名 */
export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理员',
  teacher: '老师',
  student: '学生',
}
