import { defineStore } from 'pinia'
import type {
  AnyAccount,
  MatchRelation,
  Role,
  StudentAccount,
  TeacherAccount,
} from '@/types'
import { encodeDay, encodeSubjects } from '@/utils/availability'

/**
 * 角色账号体系 Store（前端演示模式）
 *
 * ⚠️ 当前无后端：账号 / 资料 / 师生选择关系全部保存在浏览器 localStorage。
 * 后续接入后端后，本模块替换为 API 调用，组件层无需大改。
 *
 * 登录标识为 phone（数据库无 username 字段），老师/学生年级为单一数值编码。
 */

const LS_DATA = 'tutor_system_v3' // v3：phone 登录 + 年级单一数值 + 移除 guardian
const LS_CURRENT = 'tutor_system_current'

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher/home',
  student: '/student/home',
}

/* ---------------- 持久化工具 ---------------- */

function now(): string {
  return new Date().toISOString()
}

/** 空余时间快捷模板：工作日 8-19 点 / 周末 9-17 点 */
function weekdaysTemplate(weekend?: boolean): number[] {
  const work = encodeDay([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  const rest = encodeDay([9, 10, 11, 12, 13, 14, 15, 16, 17])
  return weekend ? [work, work, work, work, work, rest, rest] : [work, work, work, work, work, work, work]
}

function seedData(): { users: AnyAccount[]; relations: MatchRelation[] } {
  const t = now()
  const users: AnyAccount[] = [
    { password: '123456', role: 'admin', name: 'admin', phone: '13800000000', createdAt: t },
    {
      password: '123456', role: 'teacher', name: '王老师', gender: '女',
      phone: '13800000001', createdAt: t,
      subjects: encodeSubjects(['数学', '物理']),
      grade: 10,
      intro: '原重点中学数学骨干教师，擅长初高中数理培优。',
      availability: weekdaysTemplate(),
    },
    {
      password: '123456', role: 'teacher', name: '李老师', gender: '男',
      phone: '13800000002', createdAt: t,
      subjects: encodeSubjects(['英语']),
      grade: 8,
      intro: '高中英语提分专家，10 年毕业班经验。',
      availability: weekdaysTemplate(),
    },
    {
      password: '123456', role: 'teacher', name: '张老师', gender: '女',
      phone: '13800000003', createdAt: t,
      subjects: encodeSubjects(['语文', '钢琴']),
      grade: 4,
      intro: '钢琴十级，兼顾小学语文阅读写作启蒙。',
      availability: weekdaysTemplate(),
    },
    {
      password: '123456', role: 'student', name: '同学甲', gender: '男',
      phone: '13900000001', createdAt: t, grade: 10, subjects: encodeSubjects(['数学']),
      note: '高一，数学基础薄弱，希望周末补课。',
      availability: weekdaysTemplate(),
    },
    {
      password: '123456', role: 'student', name: '同学乙', gender: '女',
      phone: '13900000002', createdAt: t, grade: 8, subjects: encodeSubjects(['英语']),
      note: '初二，英语口语与听力需加强。',
      availability: weekdaysTemplate(),
    },
    {
      password: '123456', role: 'student', name: '同学丙', gender: '男',
      phone: '13900000003', createdAt: t, grade: 4, subjects: encodeSubjects(['语文', '数学']),
      note: '小学四年级，语文数学作业辅导。',
      availability: weekdaysTemplate(),
    },
  ]
  return { users, relations: [] }
}

function loadData(): { users: AnyAccount[]; relations: MatchRelation[] } {
  try {
    const raw = localStorage.getItem(LS_DATA)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.users) && Array.isArray(parsed.relations)) return parsed
    }
  } catch {
    /* ignore */
  }
  const seeded = seedData()
  localStorage.setItem(LS_DATA, JSON.stringify(seeded))
  return seeded
}

/** 供路由守卫直接读取当前登录人（不依赖 Pinia 实例） */
export function loadCurrentUser(): AnyAccount | null {
  try {
    const raw = localStorage.getItem(LS_CURRENT)
    return raw ? (JSON.parse(raw) as AnyAccount) : null
  } catch {
    return null
  }
}

function saveCurrent(u: AnyAccount | null) {
  if (u) localStorage.setItem(LS_CURRENT, JSON.stringify(u))
  else localStorage.removeItem(LS_CURRENT)
}

/* ---------------- Store ---------------- */

export const useSystemStore = defineStore('system', {
  state: () => ({
    users: loadData().users as AnyAccount[],
    relations: loadData().relations as MatchRelation[],
    current: loadCurrentUser() as AnyAccount | null,
  }),

  getters: {
    teachers: (s) => s.users.filter((u) => u.role === 'teacher') as TeacherAccount[],
    students: (s) => s.users.filter((u) => u.role === 'student') as StudentAccount[],
    isTeacher: (s) => s.current?.role === 'teacher',
    isStudent: (s) => s.current?.role === 'student',
    isAdmin: (s) => s.current?.role === 'admin',
    roleLabel(state) {
      return state.current ? ({ admin: '管理员', teacher: '老师', student: '学生' } as const)[state.current.role] : ''
    },
  },

  actions: {
    persist() {
      localStorage.setItem(LS_DATA, JSON.stringify({ users: this.users, relations: this.relations }))
    },

    /** 老师入驻（含账号 + 个人信息） */
    registerTeacher(payload: Omit<TeacherAccount, 'role' | 'createdAt'>): TeacherAccount {
      if (this.users.some((u) => u.phone === payload.phone)) {
        throw new Error('该手机号已被注册，请更换')
      }
      const account: TeacherAccount = { ...payload, role: 'teacher', createdAt: now() }
      this.users.push(account)
      this.persist()
      return account
    },

    /** 学生入驻（含账号 + 个人信息） */
    registerStudent(payload: Omit<StudentAccount, 'role' | 'createdAt'>): StudentAccount {
      if (this.users.some((u) => u.phone === payload.phone)) {
        throw new Error('该手机号已被注册，请更换')
      }
      const account: StudentAccount = { ...payload, role: 'student', createdAt: now() }
      this.users.push(account)
      this.persist()
      return account
    },

    login(phone: string, password: string, role: Role) {
      const user = this.users.find(
        (u) => u.phone === phone.trim() && u.password === password && u.role === role,
      )
      if (!user) throw new Error('手机号或密码错误，请核对角色后重试')
      this.current = user
      saveCurrent(user)
      return user
    },

    logout() {
      this.current = null
      saveCurrent(null)
    },

    /** 是否已存在同向选择（去重判断用） */
    hasRelation(teacherPhone: string, studentPhone: string, by: 'teacher' | 'student'): boolean {
      return this.relations.some(
        (r) => r.teacherPhone === teacherPhone && r.studentPhone === studentPhone && r.by === by,
      )
    },

    /** 发起/取消一次选择：teacher=老师选学生；student=学生选老师 */
    toggleSelect(targetPhone: string, role: 'teacher' | 'student') {
      const me = this.current
      if (!me) throw new Error('请先登录')
      if (role === 'teacher') {
        // 当前登录的是老师，目标为学生
        if (me.role !== 'teacher') throw new Error('仅老师可发起该操作')
        const teacherPhone = me.phone
        const studentPhone = targetPhone
        const existed = this.hasRelation(teacherPhone, studentPhone, 'teacher')
        this.relations = this.relations.filter(
          (r) => !(r.teacherPhone === teacherPhone && r.studentPhone === studentPhone && r.by === 'teacher'),
        )
        if (!existed) this.relations.push({ teacherPhone, studentPhone, by: 'teacher', createdAt: now() })
      } else {
        // 当前登录的是学生，目标为老师
        if (me.role !== 'student') throw new Error('仅学生可发起该操作')
        const teacherPhone = targetPhone
        const studentPhone = me.phone
        const existed = this.hasRelation(teacherPhone, studentPhone, 'student')
        this.relations = this.relations.filter(
          (r) => !(r.teacherPhone === teacherPhone && r.studentPhone === studentPhone && r.by === 'student'),
        )
        if (!existed) this.relations.push({ teacherPhone, studentPhone, by: 'student', createdAt: now() })
      }
      this.persist()
    },

    relationsOfTeacher(phone: string) {
      return this.relations.filter((r) => r.teacherPhone === phone)
    },
    relationsOfStudent(phone: string) {
      return this.relations.filter((r) => r.studentPhone === phone)
    },
  },
})
