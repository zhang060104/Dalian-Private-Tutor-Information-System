import http from './http'

/**
 * 后端接口封装（返回后端原始数据，字段映射在 store 层处理）
 */

/** 后端教师实体 */
export interface TeacherDto {
  id: number
  nickname: string
  phone: string
  age?: number
  gender?: string
  credit?: number
  grade?: number
  subject?: number
  description?: string
  status?: number
  address?: string
  timeTable1?: number
  timeTable2?: number
  timeTable3?: number
  timeTable4?: number
  timeTable5?: number
  timeTable6?: number
  timeTable7?: number
}

/** 后端学生实体 */
export interface StudentDto extends TeacherDto {}

/** 后端订单实体 */
export interface OrderDto {
  id: number
  studentId: number
  teacherId: number
  subject?: number
  hourlyWage?: number
  description?: string
  status: number
  verification?: number
  infoFee?: number
  createdAt?: string
  teacherName?: string
  studentName?: string
  otherName?: string
}

export interface LoginResult {
  token: string
  id: number
  nickname: string
  role: 'teacher' | 'student' | 'admin'
  phone: string
}

export function login(phone: string, password: string, role: string): Promise<LoginResult> {
  return http.post('/auth/login', { phone, password, role })
}

export function registerTeacher(params: Record<string, unknown>): Promise<TeacherDto> {
  return http.post('/teacher/register', params)
}

export function registerStudent(params: Record<string, unknown>): Promise<StudentDto> {
  return http.post('/student/register', params)
}

export function getTeachers(): Promise<TeacherDto[]> {
  return http.get('/teachers')
}

export function getStudents(): Promise<StudentDto[]> {
  return http.get('/students')
}

export function applyOrder(targetId: number, direction: string): Promise<OrderDto> {
  return http.post('/order/apply', { targetId, direction })
}

export function cancelOrder(targetId: number, direction: string): Promise<void> {
  return http.post('/order/cancel', { targetId, direction })
}

export function getMyOrders(): Promise<OrderDto[]> {
  return http.get('/order/mine')
}

export function adminStats(): Promise<Record<string, number>> {
  return http.get('/admin/stats')
}

export function adminTeachers(): Promise<TeacherDto[]> {
  return http.get('/admin/teachers')
}

export function adminStudents(): Promise<StudentDto[]> {
  return http.get('/admin/students')
}

export function adminOrders(): Promise<OrderDto[]> {
  return http.get('/admin/orders')
}
