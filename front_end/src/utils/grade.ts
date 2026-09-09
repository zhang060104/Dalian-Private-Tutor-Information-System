// 年级 0..17 标签与选项
// 0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业
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

/** 教师可授年级选项（文档：教师端仅可选择 13 及以上） */
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
