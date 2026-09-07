import { defineStore } from 'pinia'
import type {
  AnyAccount,
  MatchRelation,
  Role,
  StudentAccount,
  TeacherAccount,
} from '@/types'

/**
 * 角色账号体系 Store（前端演示模式）
 *
 * ⚠️ 当前无后端：账号 / 资料 / 师生选择关系全部保存在浏览器 localStorage。
 * 后续接入后端后，本模块替换为 API 调用，组件层无需大改。
 */

const LS_DATA = 'tutor_system_v1'
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

function seedData(): { users: AnyAccount[]; relations: MatchRelation[] } {
  const t = now()
  const users: AnyAccount[] = [
    { username: 'admin', password: '123456', role: 'admin', name: '系统管理员', phone: '0411-8888-6666', createdAt: t },
    {
      username: 'teacher1', password: '123456', role: 'teacher', name: '张明', gender: '男',
      phone: '13800000001', createdAt: t, subjects: ['数学', '奥数'], grades: ['初一', '初二', '初三'],
      years: 6, education: '辽宁师范大学 本科', intro: '专注中考数学提分，耐心细致，带过 200+ 学生。', pricePerHour: 180,
    },
    {
      username: 'teacher2', password: '123456', role: 'teacher', name: '李婷', gender: '女',
      phone: '13800000002', createdAt: t, subjects: ['英语'], grades: ['小学', '初一', '初二'],
      years: 4, education: '大连外国语大学 硕士', intro: '少儿英语启蒙与应试结合，课堂活泼。', pricePerHour: 160,
    },
    {
      username: 'teacher3', password: '123456', role: 'teacher', name: '王强', gender: '男',
      phone: '13800000003', createdAt: t, subjects: ['物理', '数学'], grades: ['高一', '高二', '高三'],
      years: 8, education: '大连理工大学 本科', intro: '高中物理竞赛辅导经验，擅长体系化教学。', pricePerHour: 220,
    },
    {
      username: 'student1', password: '123456', role: 'student', name: '王小雨', gender: '女',
      phone: '13900000001', createdAt: t, grade: '初二', subject: '数学', guardian: '王先生（家长）', note: '希望周末上午上课',
    },
    {
      username: 'student2', password: '123456', role: 'student', name: '刘畅', gender: '男',
      phone: '13900000002', createdAt: t, grade: '高一', subject: '物理', guardian: '刘女士（家长）',
    },
    {
      username: 'student3', password: '123456', role: 'student', name: '陈曦', gender: '女',
      phone: '13900000003', createdAt: t, grade: '小学六年级', subject: '英语', guardian: '陈先生（家长）', note: '基础薄弱，需耐心',
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
      if (this.users.some((u) => u.username === payload.username)) {
        throw new Error('该用户名已被注册，请更换')
      }
      const account: TeacherAccount = { ...payload, role: 'teacher', createdAt: now() }
      this.users.push(account)
      this.persist()
      return account
    },

    /** 学生入驻（含账号 + 个人信息） */
    registerStudent(payload: Omit<StudentAccount, 'role' | 'createdAt'>): StudentAccount {
      if (this.users.some((u) => u.username === payload.username)) {
        throw new Error('该用户名已被注册，请更换')
      }
      const account: StudentAccount = { ...payload, role: 'student', createdAt: now() }
      this.users.push(account)
      this.persist()
      return account
    },

    login(username: string, password: string, role: Role) {
      const user = this.users.find(
        (u) => u.username === username.trim() && u.password === password && u.role === role,
      )
      if (!user) throw new Error('用户名或密码错误，请核对角色后重试')
      this.current = user
      saveCurrent(user)
      return user
    },

    logout() {
      this.current = null
      saveCurrent(null)
    },

    /** 是否已存在同向选择（去重判断用） */
    hasRelation(teacherUsername: string, studentUsername: string, by: 'teacher' | 'student'): boolean {
      return this.relations.some(
        (r) => r.teacherUsername === teacherUsername && r.studentUsername === studentUsername && r.by === by,
      )
    },

    /** 发起/取消一次选择：teacher=老师选学生；student=学生选老师 */
    toggleSelect(targetUsername: string, role: 'teacher' | 'student') {
      const me = this.current
      if (!me) throw new Error('请先登录')
      if (role === 'teacher') {
        // 当前登录的是老师，目标为学生
        if (me.role !== 'teacher') throw new Error('仅老师可发起该操作')
        const teacherUsername = me.username
        const studentUsername = targetUsername
        const existed = this.hasRelation(teacherUsername, studentUsername, 'teacher')
        this.relations = this.relations.filter(
          (r) => !(r.teacherUsername === teacherUsername && r.studentUsername === studentUsername && r.by === 'teacher'),
        )
        if (!existed) this.relations.push({ teacherUsername, studentUsername, by: 'teacher', createdAt: now() })
      } else {
        // 当前登录的是学生，目标为老师
        if (me.role !== 'student') throw new Error('仅学生可发起该操作')
        const teacherUsername = targetUsername
        const studentUsername = me.username
        const existed = this.hasRelation(teacherUsername, studentUsername, 'student')
        this.relations = this.relations.filter(
          (r) => !(r.teacherUsername === teacherUsername && r.studentUsername === studentUsername && r.by === 'student'),
        )
        if (!existed) this.relations.push({ teacherUsername, studentUsername, by: 'student', createdAt: now() })
      }
      this.persist()
    },

    /** 某老师被哪些学生选择 / 某学生被哪些老师选择等查询，由组件用 getters 计算 */
    relationsOfTeacher(username: string) {
      return this.relations.filter((r) => r.teacherUsername === username)
    },
    relationsOfStudent(username: string) {
      return this.relations.filter((r) => r.studentUsername === username)
    },
  },
})
