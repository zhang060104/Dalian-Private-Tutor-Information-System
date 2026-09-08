/**
 * 大连私人家教中心 · 前端类型定义
 */

/** 教员（家教老师） */
export interface Tutor {
  id: number
  /** 姓名（脱敏展示：姓氏 + 老师） */
  name: string
  /** 性别：男 / 女 */
  gender: '男' | '女'
  /** 主教科目 */
  subjects: string[]
  /** 可教年级段 */
  grades: string[]
  /** 一句话简介 */
  intro: string
  /** 授课方式：上门 / 在线 */
  mode: ('上门' | '在线')[]
  /** 评分（0-5） */
  rating: number
  /** 累计授课（小时） */
  taughtHours: number
  /** 特色标签 */
  tags: string[]
}

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
  password: string
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
  /** 可授年级：单一数值编码（0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学） */
  grade: number
  intro: string
  /** 一周空余时间（7 个 int，见 WeekAvailability） */
  availability: WeekAvailability
}

/** 学生账号（入驻资料） */
export interface StudentAccount extends AccountBase {
  role: 'student'
  gender: '男' | '女'
  /** 年级：单一数值编码（0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学） */
  grade: number
  /** 需要辅导的科目：SUBJECT_OPTIONS 下标位掩码（单科即单 bit 置位） */
  subjects: number
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

/** 角色中文名 */
export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理员',
  teacher: '老师',
  student: '学生',
}
