// ============================================================================
// Mock 数据源（内存 + localStorage 持久化）
// 说明：此模块模拟一个「假后端」。真实后端就绪后，src/api/* 将改用 http.ts
// 的 axios 请求，页面与 store 调用签名不变、零改动。此文件届时整体移除。
// ============================================================================
import type {
  Admin, LoginPayload, LoginResult, Order, Profile, RegisterPayload,
  RequestLog, RequestType, Role, Student, Teacher, WeekTimeTables,
} from '@/types'

const LS_KEY = 'dl_tutor_mock_v2'

/** 存储层用户（含登录用的顶层 phone） */
export type StoredStudent = Student & { password: string; phone: string }
export type StoredTeacher = Teacher & { password: string; phone: string }
export type StoredUser = (Student | Teacher) & { password: string; phone: string }

/** 内存库快照 */
interface Db {
  admins: (Admin & { password: string })[]
  students: StoredStudent[]
  teachers: StoredTeacher[]
  /** 已提交注册、待管理员审核（审核通过才进入 students/teachers 可登录） */
  pendingUsers: StoredUser[]
  orders: Order[]
  requests: RequestLog[]
  seq: { user: number; order: number; request: number }
}

/** 待管理员审核的注册入驻 / 信息修改请求的统一存储（仅 mock） */
export type MockRequestEntry = {
  id: number
  type: RequestType
  tarID: number
  role: Role
  /** 请求承载的数据：注册=完整注册载荷；改信息=修改后的 Profile 字段 */
  data: unknown
  submittedAt: string
  admin_id: number
  /** 供管理端展示的发起人昵称/概要 */
  summary: string
}

let db: Db | null = null

function load(): Db {
  if (db) return db
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      db = JSON.parse(raw) as Db
      return db
    }
  } catch {
    /* ignore */
  }
  db = buildSeed()
  persist()
  return db
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  } catch {
    /* ignore quota */
  }
}

/** 模拟网络延迟，便于展示 loading */
function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(data), ms))
}

/** 重置为种子数据（供调试按钮 / 刷新 demo） */
export function resetMock(): void {
  db = buildSeed()
  persist()
}

/** 返回内存库引用（供 mockApi 内部读改写，勿在视图层直接使用） */
export function getDb(): Db {
  return load()
}
export { persist }

// ---------------------- 种子数据 ----------------------
const WEEK: WeekTimeTables = [0, 0, 0, 0, 0, 0, 0]
/** 位操作：返回第 i 天(0..6) 空余 set 的小时集合掩码 */
function days(hoursByDay: number[][]): WeekTimeTables {
  const t: number[] = [0, 0, 0, 0, 0, 0, 0]
  hoursByDay.forEach((hours, day) => {
    let m = 0
    hours.forEach((h) => (m |= 1 << h))
    t[day] = m
  })
  return t as WeekTimeTables
}

const fmt = (n: number) => n.toString()

function buildSeed(): Db {
  const students: StoredStudent[] = [
    {
      id: 1, role: 'student', nickname: '陈思远', password: '123456', phone: '13900000001',
      age: 15, gender: '男', credit: 100, grade: 9, subject: (1 << 0) | (1 << 1) | (1 << 2),
      description: '初三学生，数学和英语偏弱，希望周末上午补习，家住沙河口区。',
      status: 0, address: '沙河口区·西安路（缴费后可见精确地址）',
      timeTables: days([[9, 10, 11, 15, 16], [9, 10, 11], [19, 20], [19, 20], [19, 20], [9, 10, 11, 14, 15, 16], [0, 0]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13900000001', QRcode: '/mock/qr/stu1.png', IDcard: '/mock/id/stu1.png' },
    },
    {
      id: 2, role: 'student', nickname: '林小满', password: '123456', phone: '13900000002',
      age: 11, gender: '女', credit: 98, grade: 5, subject: (1 << 1) | (1 << 7) | (1 << 12),
      description: '五年级，钢琴五级，想要补习英语并继续学钢琴。',
      status: 0, address: '中山区·青泥洼桥',
      timeTables: days([[18, 19], [18, 19], [16, 17, 18], [0, 0], [0, 0], [10, 11, 15, 16, 17], [10, 11]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13900000002', QRcode: '/mock/qr/stu2.png', IDcard: '/mock/id/stu2.png' },
    },
    {
      id: 3, role: 'student', nickname: '赵一航', password: '123456', phone: '13900000003',
      age: 17, gender: '男', credit: 92, grade: 12, subject: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4),
      description: '高三理科，冲刺高考，需要数理化全科辅导，周末两天均可。',
      status: 0, address: '甘井子区·华南广场',
      timeTables: days([[0, 0], [0, 0], [19, 20, 21], [19, 20, 21], [19, 20, 21], [8, 9, 10, 11, 14, 15, 16, 17, 18], [8, 9, 10, 11, 14, 15, 16]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13900000003', QRcode: '/mock/qr/stu3.png', IDcard: '/mock/id/stu3.png' },
    },
    {
      id: 4, role: 'student', nickname: '周雨桐', password: '123456', phone: '13900000004',
      age: 8, gender: '女', credit: 100, grade: 3, subject: (1 << 8) | (1 << 0) | (1 << 1),
      description: '三年级，喜欢画画，需要语文数学基础巩固和素描启蒙。',
      status: 1, address: '西岗区·人民广场', // status 1：不参与列表
      timeTables: days([[16, 17, 18], [16, 17, 18], [16, 17], [0, 0], [0, 0], [9, 10, 11], [9, 10]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13900000004', QRcode: '/mock/qr/stu4.png', IDcard: '/mock/id/stu4.png' },
    },
    {
      id: 5, role: 'student', nickname: '吴子墨', password: '123456', phone: '13900000005',
      age: 20, gender: '男', credit: 105, grade: 15, subject: (1 << 19) | (1 << 20),
      description: '大三计算机，考研数据结构算法，需要编程辅导与答疑。',
      status: 0, address: '高新园区·软件园',
      timeTables: days([[0, 0], [19, 20, 21], [19, 20, 21], [19, 20, 21], [0, 0], [13, 14, 15, 16, 17], [13, 14, 15]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13900000005', QRcode: '/mock/qr/stu5.png', IDcard: '/mock/id/stu5.png' },
    },
  ]

  const teachers: StoredTeacher[] = [
    {
      id: 1, role: 'teacher', nickname: '王老师', password: '123456', phone: '13800000001',
      age: 32, gender: '女', credit: 120, grade: 17, subject: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4),
      description: '重点中学在职数学教师，8 年教龄，擅长初中高中数学培优与中考冲刺。',
      status: 0, address: '中山区（缴费后可见精确地址）',
      timeTables: days([[18, 19, 20], [18, 19, 20], [18, 19], [0, 0], [0, 0], [8, 9, 10, 11, 14, 15], [8, 9, 10, 11, 14, 15, 16]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13800000001', QRcode: '/mock/qr/t1.png', IDcard: '/mock/id/t1.png', certificate: '/mock/cert/t1.png' },
    },
    {
      id: 2, role: 'teacher', nickname: '李老师', password: '123456', phone: '13800000002',
      age: 28, gender: '男', credit: 100, grade: 17, subject: (1 << 19) | (1 << 20) | (1 << 1),
      description: '计算机研究生在读，可辅导 C/C++/Python、算法竞赛与数据结构。',
      status: 0, address: '高新园区',
      timeTables: days([[0, 0], [19, 20, 21], [19, 20, 21], [19, 20, 21], [0, 0], [10, 11, 14, 15, 16], [10, 11, 14, 15, 16]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13800000002', QRcode: '/mock/qr/t2.png', IDcard: '/mock/id/t2.png', certificate: '/mock/cert/t2.png' },
    },
    {
      id: 3, role: 'teacher', nickname: '张老师', password: '123456', phone: '13800000003',
      age: 26, gender: '女', credit: 90, grade: 17, subject: (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12) | (1 << 13) | (1 << 14),
      description: '美术院校毕业，可带素描/色彩/速写艺考，也教钢琴与吉他入门。',
      status: 0, address: '沙河口区',
      timeTables: days([[16, 17, 18, 19], [16, 17, 18], [0, 0], [16, 17, 18, 19], [0, 0], [9, 10, 11, 13, 14, 15, 16], [9, 10, 11, 13, 14, 15]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13800000003', QRcode: '/mock/qr/t3.png', IDcard: '/mock/id/t3.png', certificate: '/mock/cert/t3.png' },
    },
    {
      id: 4, role: 'teacher', nickname: '刘老师', password: '123456', phone: '13800000004',
      age: 45, gender: '男', credit: 135, grade: 17, subject: (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
      description: '退休重点高中物理化学教师，20 年高三把关经验。',
      status: 0, address: '甘井子区',
      timeTables: days([[0, 0], [18, 19, 20], [18, 19, 20], [18, 19, 20], [18, 19, 20], [8, 9, 10, 11, 14, 15, 16], [8, 9, 10, 11, 14, 15, 16, 17]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13800000004', QRcode: '/mock/qr/t4.png', IDcard: '/mock/id/t4.png', certificate: '/mock/cert/t4.png' },
    },
    {
      id: 5, role: 'teacher', nickname: '陈老师', password: '123456', phone: '13800000005',
      age: 29, gender: '女', credit: 88, grade: 17, subject: (1 << 15) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 2),
      description: '外语学院毕业，精通俄/德/日/韩多语种，也教初高中英语。',
      status: 1, address: '西岗区', // 演示：一名已停止寻找的老师不参与列表
      timeTables: days([[18, 19, 20], [18, 19, 20], [0, 0], [18, 19, 20], [0, 0], [9, 10, 11], [0, 0]]),
      location: null, phoneVisible: false, isSelf: false,
      privateFields: { phone: '13800000005', QRcode: '/mock/qr/t5.png', IDcard: '/mock/id/t5.png', certificate: '/mock/cert/t5.png' },
    },
  ]

  const admins: (Admin & { password: string })[] = [
    { id: 0, nickname: '超级管理员', phone: 'admin', password: 'admin123' }, // ID0 不可删
    { id: 1, nickname: '审核专员', phone: '13700000001', password: '123456' },
  ]

  const now = new Date().toISOString()
  const orders: Order[] = [
    {
      id: 1, student_id: 1, teacher_id: 1, subject: 1 << 1, hourly_wage: 120,
      infoFee: 0, description: '每周六上午两小时，初三数学一对一培优。',
      status: 9, verification: 7 /*111: 全部缴清 */,
      depositImgTea: '', depositImgStu: '', infoFeeImg: '', infoFeeQR: '',
      timeTables: days([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [9, 10, 11], [0, 0]]),
      createdAt: now, peer: { id: 1, role: 'student', nickname: '陈思远', grade: 9, subject: 1 << 1, credit: 100 },
    },
  ]

  const requests: RequestLog[] = []

  return {
    admins, students, teachers, pendingUsers: [], orders, requests,
    seq: { user: 100, order: 100, request: 100 },
  }
}

// ---------------------- 导出内部访问与账号演示 ----------------------
export function dumpDb(): Db {
  return load()
}
export function nextUser(): number {
  return load().seq.user++
}
export function nextOrder(): number {
  return load().seq.order++
}
export function nextRequest(): number {
  return load().seq.request++
}

/** 演示账号表（供登录提示/自动填入） */
export const DEMO_ACCOUNTS: { role: Role; label: string; phone: string; password: string }[] = [
  { role: 'student', label: '学生·陈思远', phone: '13900000001', password: '123456' },
  { role: 'teacher', label: '教师·王老师', phone: '13800000001', password: '123456' },
]

// ---------------------- 登录（mock） ----------------------
export async function mockLogin(p: LoginPayload): Promise<LoginResult> {
  const d = load()
  if (p.role === 'admin') {
    const a = d.admins.find((x) => (x.phone === p.phone || x.nickname === p.phone) && x.password === p.password)
    if (!a) throw new Error('管理员账号或密码错误')
    return delay({ token: 'mock-token-admin-' + a.id, role: 'admin', id: a.id, nickname: a.nickname })
  }
  const arr = p.role === 'student' ? d.students : d.teachers
  const u = arr.find((x) => x.phone === p.phone && x.password === p.password)
  if (!u) throw new Error('手机号或密码错误，或该账号尚未通过审核')
  return delay({ token: 'mock-token-' + p.role + '-' + u.id, role: u.role, id: u.id, nickname: u.nickname })
}

// ---------------------- 管理员登录（mock，独立实现，不混入通用 mockLogin） ----------------------
export async function mockAdminLogin(account: string, password: string): Promise<LoginResult> {
  const d = load()
  const a = d.admins.find((x) => (x.phone === account || x.nickname === account) && x.password === password)
  if (!a) throw new Error('管理员账号或密码错误')
  return delay({ token: 'mock-token-admin-' + a.id, role: 'admin', id: a.id, nickname: a.nickname })
}

// ---------------------- 对外便捷读取原始记录 ----------------------
export function findStudentRaw(id: number): StoredStudent | undefined {
  return load().students.find((s) => s.id === id)
}
export function findTeacherRaw(id: number): StoredTeacher | undefined {
  return load().teachers.find((s) => s.id === id)
}
export function findUserRaw(role: Role, id: number): StoredUser | undefined {
  if (role === 'student') return findStudentRaw(id)
  if (role === 'teacher') return findTeacherRaw(id)
  return undefined
}
