import { defineStore } from 'pinia'
import type {
  AnyAccount,
  MatchRelation,
  Role,
  StudentAccount,
  TeacherAccount,
} from '@/types'
import * as api from '@/api'
import { TOKEN_KEY } from '@/api/http'
import type { LoginResult, OrderDto, StudentDto, TeacherDto } from '@/api'

/**
 * 角色账号体系 Store（已接入后端 API）
 *
 * 数据来源：/api 后端接口；登录令牌存 localStorage（tutor_token），
 * 当前登录人缓存到 localStorage（tutor_system_current）供路由守卫读取。
 */

const LS_CURRENT = 'tutor_system_current'

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher/home',
  student: '/student/home',
}

/* ---------------- 字段映射（后端实体 → 前端类型） ---------------- */

function teacherFromDto(dto: TeacherDto): TeacherAccount {
  return {
    id: dto.id,
    password: '',
    role: 'teacher',
    name: dto.nickname,
    phone: dto.phone,
    createdAt: '',
    gender: (dto.gender as '男' | '女') ?? '男',
    subjects: dto.subject ?? 0,
    grade: dto.grade ?? 0,
    intro: dto.description ?? '',
    availability: [dto.timeTable1, dto.timeTable2, dto.timeTable3, dto.timeTable4, dto.timeTable5, dto.timeTable6, dto.timeTable7].map((v) => v ?? 0),
  }
}

function studentFromDto(dto: StudentDto): StudentAccount {
  return {
    id: dto.id,
    password: '',
    role: 'student',
    name: dto.nickname,
    phone: dto.phone,
    createdAt: '',
    gender: (dto.gender as '男' | '女') ?? '男',
    grade: dto.grade ?? 0,
    subjects: dto.subject ?? 0,
    note: dto.description || undefined,
    availability: [dto.timeTable1, dto.timeTable2, dto.timeTable3, dto.timeTable4, dto.timeTable5, dto.timeTable6, dto.timeTable7].map((v) => v ?? 0),
  }
}

function accountFromLogin(res: LoginResult): AnyAccount {
  if (res.role === 'admin') {
    return { id: res.id, password: '', role: 'admin', name: res.nickname, phone: res.phone, createdAt: '' }
  }
  if (res.role === 'teacher') {
    return {
      id: res.id, password: '', role: 'teacher', name: res.nickname, phone: res.phone, createdAt: '',
      gender: '男', subjects: 0, grade: 0, intro: '', availability: [0, 0, 0, 0, 0, 0, 0],
    }
  }
  return {
    id: res.id, password: '', role: 'student', name: res.nickname, phone: res.phone, createdAt: '',
    gender: '男', grade: 0, subjects: 0, availability: [0, 0, 0, 0, 0, 0, 0],
  }
}

/* ---------------- 持久化工具 ---------------- */

function saveCurrent(u: AnyAccount | null) {
  if (u) localStorage.setItem(LS_CURRENT, JSON.stringify(u))
  else localStorage.removeItem(LS_CURRENT)
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

/* ---------------- Store ---------------- */

export const useSystemStore = defineStore('system', {
  state: () => ({
    teachers: [] as TeacherAccount[],
    students: [] as StudentAccount[],
    relations: [] as MatchRelation[],
    current: loadCurrentUser() as AnyAccount | null,
  }),

  getters: {
    isTeacher: (s) => s.current?.role === 'teacher',
    isStudent: (s) => s.current?.role === 'student',
    isAdmin: (s) => s.current?.role === 'admin',
    roleLabel(state) {
      return state.current ? ({ admin: '管理员', teacher: '老师', student: '学生' } as const)[state.current.role] : ''
    },
  },

  actions: {
    /** 登录：phone + password + role */
    async login(phone: string, password: string, role: Role): Promise<AnyAccount> {
      const res = await api.login(phone, password, role)
      localStorage.setItem(TOKEN_KEY, res.token)
      this.current = accountFromLogin(res)
      // 加载列表，并用完整资料覆盖当前用户
      await this.loadAll()
      if (role === 'teacher') {
        const full = this.teachers.find((t) => t.id === res.id)
        if (full) this.current = full
      } else if (role === 'student') {
        const full = this.students.find((s) => s.id === res.id)
        if (full) this.current = full
      }
      saveCurrent(this.current)
      return this.current
    },

    logout() {
      this.current = null
      this.teachers = []
      this.students = []
      this.relations = []
      localStorage.removeItem(TOKEN_KEY)
      saveCurrent(null)
    },

    /** 加载老师/学生列表 + 当前用户的选择关系 */
    async loadAll() {
      const [teachers, students] = await Promise.all([api.getTeachers(), api.getStudents()])
      this.teachers = teachers.map(teacherFromDto)
      this.students = students.map(studentFromDto)
      await this.loadRelations()
    },

    async loadRelations() {
      if (this.current && (this.current.role === 'teacher' || this.current.role === 'student')) {
        const orders = await api.getMyOrders()
        this.relations = orders.map((o) => this.orderToRelation(o))
      }
    },

    orderToRelation(o: OrderDto): MatchRelation {
      const teacher = this.teachers.find((t) => t.id === o.teacherId)
      const student = this.students.find((s) => s.id === o.studentId)
      return {
        teacherPhone: teacher?.phone ?? '',
        studentPhone: student?.phone ?? '',
        by: o.status === 0 ? 'teacher' : 'student',
        createdAt: o.createdAt ?? '',
      }
    },

    /** 老师入驻 */
    async registerTeacher(payload: Omit<TeacherAccount, 'role' | 'createdAt' | 'id'>): Promise<void> {
      await api.registerTeacher({
        nickname: payload.name,
        password: payload.password,
        phone: payload.phone,
        gender: payload.gender,
        grade: payload.grade,
        subject: payload.subjects,
        description: payload.intro,
        timeTable1: payload.availability[0],
        timeTable2: payload.availability[1],
        timeTable3: payload.availability[2],
        timeTable4: payload.availability[3],
        timeTable5: payload.availability[4],
        timeTable6: payload.availability[5],
        timeTable7: payload.availability[6],
      })
    },

    /** 学生入驻 */
    async registerStudent(payload: Omit<StudentAccount, 'role' | 'createdAt' | 'id'>): Promise<void> {
      await api.registerStudent({
        nickname: payload.name,
        password: payload.password,
        phone: payload.phone,
        gender: payload.gender,
        grade: payload.grade,
        subject: payload.subjects,
        description: payload.note ?? '',
        timeTable1: payload.availability[0],
        timeTable2: payload.availability[1],
        timeTable3: payload.availability[2],
        timeTable4: payload.availability[3],
        timeTable5: payload.availability[4],
        timeTable6: payload.availability[5],
        timeTable7: payload.availability[6],
      })
    },

    /** 发起/取消一次选择：teacher=老师选学生；student=学生选老师 */
    async toggleSelect(targetPhone: string, role: 'teacher' | 'student') {
      const me = this.current
      if (!me) throw new Error('请先登录')
      let targetId: number | undefined
      if (role === 'teacher') {
        if (me.role !== 'teacher') throw new Error('仅老师可发起该操作')
        targetId = this.students.find((s) => s.phone === targetPhone)?.id
      } else {
        if (me.role !== 'student') throw new Error('仅学生可发起该操作')
        targetId = this.teachers.find((t) => t.phone === targetPhone)?.id
      }
      if (!targetId) throw new Error('目标不存在')

      const teacherPhone = role === 'teacher' ? me.phone : targetPhone
      const studentPhone = role === 'teacher' ? targetPhone : me.phone
      const existed = this.relations.some(
        (r) => r.teacherPhone === teacherPhone && r.studentPhone === studentPhone && r.by === role,
      )
      if (existed) {
        await api.cancelOrder(targetId, role)
      } else {
        await api.applyOrder(targetId, role)
      }
      await this.loadRelations()
    },

    /** 某老师相关的选择关系 */
    relationsOfTeacher(phone: string) {
      return this.relations.filter((r) => r.teacherPhone === phone)
    },
    relationsOfStudent(phone: string) {
      return this.relations.filter((r) => r.studentPhone === phone)
    },
  },
})
