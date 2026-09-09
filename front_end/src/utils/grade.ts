// 年级 0..17 标签与选项
// 0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业
// 语义分角色：
//   - 学生：grade = 学生本人就读年级（需要辅导的阶段）
//   - 教师：grade = 教师本人学历阶段。本系统教师是大学生兼职家教 或 全职（已毕业）教师，
//           故教师可选范围仅为大学阶段及以上；"能教的对象年级"不由 grade 表达，而靠可授科目
//           (subject) 与简介描述体现，切勿把教师 grade 当"可授年级"使用。
export const GRADE_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: '幼儿园' },
  { value: 1, label: '小学一年级' },
  { value: 2, label: '小学二年级' },
  { value: 3, label: '小学三年级' },
  { value: 4, label: '小学四年级' },
  { value: 5, label: '小学五年级' },
  { value: 6, label: '小学六年级' },
  { value: 7, label: '初一' },
  { value: 8, label: '初二' },
  { value: 9, label: '初三' },
  { value: 10, label: '高一' },
  { value: 11, label: '高二' },
  { value: 12, label: '高三' },
  { value: 13, label: '大一' },
  { value: 14, label: '大二' },
  { value: 15, label: '大三' },
  { value: 16, label: '大四' },
  { value: 17, label: '已毕业' },
]

/** 教师可选年级（本人学历阶段）：仅大学生（13-16）及已毕业（17）可注册为教师 */
export const TEACHER_GRADE_LEVELS = GRADE_LEVELS.filter((g) => g.value >= 13)

export function gradeLabel(v: number): string {
  return GRADE_LEVELS.find((g) => g.value === v)?.label ?? `未知(${v})`
}

/** 把年级归类为学段 */
export function gradeStage(v: number): string {
  if (v === 0) return '幼儿园'
  if (v <= 6) return '小学'
  if (v <= 9) return '初中'
  if (v <= 12) return '高中'
  if (v <= 16) return '大学'
  return '已毕业'
}
