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
  /** 教龄（年） */
  years: number
  /** 学历背景 */
  education: string
  /** 一句话简介 */
  intro: string
  /** 授课方式：上门 / 在线 */
  mode: ('上门' | '在线')[]
  /** 课时费（元/小时） */
  pricePerHour: number
  /** 评分（0-5） */
  rating: number
  /** 累计授课（小时） */
  taughtHours: number
  /** 特色标签 */
  tags: string[]
}

/** 找家教需求表单 */
export interface TutorRequest {
  /** 家长称呼 */
  parentName: string
  /** 联系电话/微信 */
  contact: string
  /** 学生年级 */
  grade: string
  /** 辅导科目 */
  subject: string
  /** 授课方式 */
  mode: '上门' | '在线' | '均可'
  /** 期望上课时间 */
  schedule: string
  /** 补充说明 */
  remark?: string
}

/** 中心联系方式（集中维护，便于替换真实信息） */
export const CENTER_CONTACT = {
  name: '大连私人家教中心',
  slogan: '严选师资 · 免费试听 · 按次付费',
  phone: '0411-8888-6666',
  serviceTime: '周一至周日 8:00 - 21:00',
  email: 'contact@tutor-dalian.example.com',
  address: '大连市（各区分中心，详情电话咨询）',
  wechat: 'dalian-tutor',
}

/* ==================== 角色账号体系（老师 / 学生 / 管理员） ==================== */

/** 系统角色 */
export type Role = 'admin' | 'teacher' | 'student'

/** 账号基类 */
export interface AccountBase {
  username: string
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
  /** 可教年级：GRADE_OPTIONS 下标位掩码（bit i = GRADE_OPTIONS[i] 选中） */
  grades: number
  years: number
  education: string
  intro: string
  pricePerHour: number
  /** 一周空余时间（7 个 int，见 WeekAvailability） */
  availability: WeekAvailability
}

/** 学生账号（入驻资料） */
export interface StudentAccount extends AccountBase {
  role: 'student'
  gender: '男' | '女'
  grade: string
  /** 需要辅导的科目：SUBJECT_OPTIONS 下标位掩码（单科即单 bit 置位） */
  subjects: number
  guardian: string
  note?: string
  /** 一周空余时间（7 个 int，见 WeekAvailability） */
  availability: WeekAvailability
}

/** 管理员账号 */
export interface AdminAccount extends AccountBase {
  role: 'admin'
}

export type AnyAccount = AdminAccount | TeacherAccount | StudentAccount

/** 师生双向选择关系（老师选学生 / 学生选老师） */
export interface MatchRelation {
  teacherUsername: string
  studentUsername: string
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
