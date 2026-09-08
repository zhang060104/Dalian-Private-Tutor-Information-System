/**
 * 角色资料相关的常量与工具（无任何 mock 数据，全部来自后端接口）
 */

/**
 * 年级数值编码（与数据库设计文档严格一致）：
 * 0=幼儿园，1~6=小学一~六年级，7~9=初一~初三，10~12=高一~高三，13~16=大一~大四，17=已毕业
 * 老师侧该值表示「可授年级」（可授课面对的学段），学生侧表示「当前在读年级」。
 * 单选（数据库 grade 为单一 int，非位掩码）。
 */
export const GRADE_LEVELS: Array<{ value: number; label: string }> = [
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

/** 年级数值 → 文本（未匹配返回原值） */
export function gradeLabel(value: number): string {
  const found = GRADE_LEVELS.find((g) => g.value === value)
  return found ? found.label : String(value)
}

/**
 * 科目顺序（编码顺序）与数据库设计文档严格一致：
 * {语文，数学，英语，物理，化学，生物，政治，历史，地理，素描，色彩，速写，乐理，钢琴，吉他，俄语，德语，日语，韩语，编程，算法，心理辅导，体育，自定义}
 * 共 24 科，subject 为 int 位掩码（bit i = 本列表第 i 项，低 24 位有效）。
 */
export const SUBJECT_OPTIONS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '政治',
  '历史',
  '地理',
  '素描',
  '色彩',
  '速写',
  '乐理',
  '钢琴',
  '吉他',
  '俄语',
  '德语',
  '日语',
  '韩语',
  '编程',
  '算法',
  '心理辅导',
  '体育',
  '自定义',
] as const
