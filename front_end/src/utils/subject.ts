// 24 科目位掩码编解码
// 顺序严格对齐《项目设计说明文档.md》：subject int 低 24 位，1=需要/可授
export const SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理',
  '素描', '色彩', '速写', '乐理', '钢琴', '吉他', '俄语', '德语', '日语', '韩语',
  '编程', '算法', '心理辅导', '体育', '自定义',
] as const

export type SubjectLabel = (typeof SUBJECTS)[number]

export const SUBJECT_COUNT = SUBJECTS.length // 24

/** 从位掩码解析出已选科目名列表 */
export function decodeSubjects(mask: number): SubjectLabel[] {
  const out: SubjectLabel[] = []
  for (let i = 0; i < SUBJECT_COUNT; i++) {
    if (mask & (1 << i)) out.push(SUBJECTS[i])
  }
  return out
}

/** 把科目下标列表编码成位掩码 */
export function encodeSubjects(indexes: number[]): number {
  return indexes.reduce((acc, i) => acc | (1 << i), 0)
}

/** 由科目名反向找下标 */
export function subjectIndex(name: SubjectLabel): number {
  const i = SUBJECTS.indexOf(name)
  return i < 0 ? SUBJECT_COUNT - 1 : i
}
