import { defineStore } from 'pinia'
import type {
  AnyAccount,
  MatchRelation,
  ProfileReview,
  ProfileReviewField,
  Role,
  StudentAccount,
  TeacherAccount,
} from '@/types'
import { encodeDay, encodeGrades, encodeSubjects } from '@/utils/availability'

/**
 * 角色账号体系 Store（前端演示模式）
 *
 * ⚠️ 当前无后端：账号 / 资料 / 师生选择关系全部保存在浏览器 localStorage。
 * 后续接入后端后，本模块替换为 API 调用，组件层无需大改。
 */

const LS_DATA = 'tutor_system_v2' // v2：空余时间(7×int) + 科目/年级位掩码；含 reviews（资料修改审核队列）
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

function seedData(): { users: AnyAccount[]; relations: MatchRelation[]; reviews: ProfileReview[] } {
  const t = now()
  const users: AnyAccount[] = [
    { username: 'admin', password: '123456', role: 'admin', name: '系统管理员', phone: '0411-8888-6666', createdAt: t },
    {
      username: 'teacher1', password: '123456', role: 'teacher', name: '张明', gender: '男',
      phone: '13800000001', createdAt: t,
      subjects: encodeSubjects(['数学']),
      grades: encodeGrades(['初一', '初二', '初三']),
      intro: '专注中考数学提分，耐心细致，带过 200+ 学生。',
      availability: weekdaysTemplate(),
    },
    {
      username: 'teacher2', password: '123456', role: 'teacher', name: '李婷', gender: '女',
      phone: '13800000002', createdAt: t,
      subjects: encodeSubjects(['英语']),
      grades: encodeGrades(['小学', '初一', '初二']),
      intro: '少儿英语启蒙与应试结合，课堂活泼。',
      availability: [encodeDay([17, 18, 19, 20]), encodeDay([17, 18, 19, 20]), encodeDay([17, 18, 19, 20]), encodeDay([17, 18, 19, 20]), encodeDay([17, 18, 19, 20]), encodeDay([8, 9, 10, 11, 12, 13, 14, 15]), encodeDay([8, 9, 10, 11, 12, 13, 14, 15])],
    },
    {
      username: 'teacher3', password: '123456', role: 'teacher', name: '王强', gender: '男',
      phone: '13800000003', createdAt: t,
      subjects: encodeSubjects(['物理', '数学']),
      grades: encodeGrades(['高一', '高二', '高三']),
      intro: '高中物理竞赛辅导经验，擅长体系化教学。',
      availability: weekdaysTemplate(),
    },
    {
      username: 'student1', password: '123456', role: 'student', name: '王小雨', gender: '女',
      phone: '13900000001', createdAt: t, grade: '初二', subjects: encodeSubjects(['数学']),
      guardian: '王先生（家长）', note: '希望周末上午上课',
      availability: [encodeDay([]), encodeDay([18, 19, 20, 21]), encodeDay([18, 19, 20, 21]), encodeDay([18, 19, 20, 21]), encodeDay([18, 19, 20, 21]), encodeDay([9, 10, 11, 12, 13, 14, 15, 16, 17]), encodeDay([9, 10, 11, 12, 13, 14, 15, 16, 17])],
    },
    {
      username: 'student2', password: '123456', role: 'student', name: '刘畅', gender: '男',
      phone: '13900000002', createdAt: t, grade: '高一', subjects: encodeSubjects(['物理']),
      guardian: '刘女士（家长）',
      availability: [encodeDay([19, 20, 21]), encodeDay([19, 20, 21]), encodeDay([]), encodeDay([19, 20, 21]), encodeDay([19, 20, 21]), encodeDay([9, 10, 11, 12, 13, 14, 15]), encodeDay([])],
    },
    {
      username: 'student3', password: '123456', role: 'student', name: '陈曦', gender: '女',
      phone: '13900000003', createdAt: t, grade: '小学六年级', subjects: encodeSubjects(['英语']),
      guardian: '陈先生（家长）', note: '基础薄弱，需耐心',
      availability: weekdaysTemplate(false),
    },
  ]
  return { users, relations: [], reviews: [] }
}

function loadData(): { users: AnyAccount[]; relations: MatchRelation[]; reviews: ProfileReview[] } {
  try {
    const raw = localStorage.getItem(LS_DATA)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.users) && Array.isArray(parsed.relations)) {
        // 兼容旧版本数据：v2 之前无 reviews 字段
        return { users: parsed.users, relations: parsed.relations, reviews: parsed.reviews ?? [] }
      }
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
  state: () => {
    const data = loadData()
    // current 若与 users 中的实时资料不一致（如资料刚被管理员审核通过），以 users 为准
    const cached = loadCurrentUser()
    const live =
      cached && cached.role !== 'admin'
        ? (data.users.find((u) => u.username === cached.username && u.role === cached.role) as AnyAccount | undefined)
        : undefined
    return {
      users: data.users as AnyAccount[],
      relations: data.relations as MatchRelation[],
      reviews: data.reviews as ProfileReview[],
      current: (live ?? cached) as AnyAccount | null,
    }
  },

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
      localStorage.setItem(LS_DATA, JSON.stringify({ users: this.users, relations: this.relations, reviews: this.reviews }))
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

    /* ---------------- 个人资料修改审核（学生/老师提交 → 管理员审核） ---------------- */

    /** 该用户当前是否有待审核的资料修改申请 */
    pendingReviewOf(username: string): ProfileReview | undefined {
      return this.reviews.find((r) => r.username === username)
    },

    /**
     * 提交个人资料修改申请。
     * 审核通过前 users 中保持旧资料（对外展示不变）；同一用户同时仅允许一条待审申请。
     */
    submitProfileReview(
      username: string,
      role: 'teacher' | 'student',
      name: string,
      next: Partial<TeacherAccount> | Partial<StudentAccount>,
      fields: ProfileReviewField[],
    ) {
      if (this.pendingReviewOf(username)) {
        throw new Error('你已有一份资料修改申请待管理员审核，请耐心等待结果')
      }
      const review: ProfileReview = {
        id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        username,
        role,
        name,
        submittedAt: now(),
        next,
        fields,
      }
      this.reviews.push(review)
      this.persist()
      return review
    },

    /** 本人撤销自己的待审申请（仅登录本人可操作） */
    cancelProfileReview(id: string) {
      const me = this.current
      const review = this.reviews.find((r) => r.id === id)
      if (!review) throw new Error('申请不存在或已被处理')
      if (!me || me.username !== review.username) throw new Error('仅申请人本人可撤销')
      this.reviews = this.reviews.filter((r) => r.id !== id)
      this.persist()
    },

    /** 管理员审核通过：把申请的新资料合并进用户，移除申请 */
    approveProfileReview(id: string) {
      const idx = this.reviews.findIndex((r) => r.id === id)
      if (idx < 0) throw new Error('申请不存在或已被处理')
      const review = this.reviews[idx]
      const user = this.users.find((u) => u.username === review.username && u.role === review.role)
      if (!user) throw new Error('对应用户不存在')
      Object.assign(user, review.next)
      // 若被修改的正是当前登录会话（极少见），同步刷新登录态
      if (this.current?.username === review.username) saveCurrent(user)
      this.reviews.splice(idx, 1)
      this.persist()
    },

    /** 管理员审核驳回：丢弃申请（保留原资料） */
    rejectProfileReview(id: string) {
      const idx = this.reviews.findIndex((r) => r.id === id)
      if (idx < 0) throw new Error('申请不存在或已被处理')
      this.reviews.splice(idx, 1)
      this.persist()
    },
  },
})
