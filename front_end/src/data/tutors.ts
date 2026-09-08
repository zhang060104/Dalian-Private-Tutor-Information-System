import type { Tutor } from '@/types'

/**
 * 教员库 mock 数据（初始化阶段静态展示用）
 * ⚠️ 后续接入后端后由接口替换，勿在此维护真实师资信息。
 */

export const GRADE_OPTIONS = ['小学', '初一', '初二', '初三', '高一', '高二', '高三'] as const

/**
 * 年级数值编码（与数据库设计文档严格一致）：
 * 0=幼儿园，1~6=小学一~六年级，7~9=初一~初三，10~12=高一~高三，13~16=大一~大四
 * 入驻（老师/学生）的 grade 为单一数值，不再是位掩码。
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

export const TUTORS: Tutor[] = [
  {
    id: 1,
    name: '王老师',
    gender: '女',
    subjects: ['数学'],
    grades: ['小学', '初一', '初二', '初三'],
    intro: '原重点小学数学骨干教师，擅长奥数思维启蒙与小升初培优，所带学员竞赛获奖 40+。',
    mode: ['上门', '在线'],
    rating: 4.9,
    taughtHours: 6800,
    tags: ['骨干教师', '竞赛辅导', '小升初'],
  },
  {
    id: 2,
    name: '李老师',
    gender: '男',
    subjects: ['物理', '数学'],
    grades: ['初二', '初三', '高一', '高二', '高三'],
    intro: '高中物理提分专家，10 年毕业班经验，独创「模型化解题」方法，平均提分 25+。',
    mode: ['上门', '在线'],
    rating: 5.0,
    taughtHours: 9200,
    tags: ['博士', '毕业班', '提分快'],
  },
  {
    id: 3,
    name: '张老师',
    gender: '女',
    subjects: ['英语'],
    grades: ['小学', '初一', '初二', '初三', '高一', '高二', '高三'],
    intro: '前新东方金牌讲师，擅长语法体系重建与口语听力训练，课堂活泼、孩子接受度高。',
    mode: ['在线', '上门'],
    rating: 4.8,
    taughtHours: 5100,
    tags: ['专八', '口语强', '耐心细致'],
  },
  {
    id: 4,
    name: '刘老师',
    gender: '男',
    subjects: ['化学'],
    grades: ['初三', '高一', '高二', '高三'],
    intro: '高中化学竞赛教练，熟悉新高考命题方向，实验题与推断题专项突破效果显著。',
    mode: ['上门'],
    rating: 4.9,
    taughtHours: 6100,
    tags: ['竞赛教练', '新高考'],
  },
  {
    id: 5,
    name: '陈老师',
    gender: '女',
    subjects: ['语文'],
    grades: ['小学', '初一', '初二', '初三'],
    intro: '擅长阅读写作一体化教学与古诗词积累，帮助孩子建立语文学习习惯，家长好评率高。',
    mode: ['上门', '在线'],
    rating: 4.8,
    taughtHours: 4300,
    tags: ['硕士', '阅读写作', '习惯培养'],
  },
  {
    id: 6,
    name: '赵老师',
    gender: '男',
    subjects: ['数学', '物理'],
    grades: ['高一', '高二', '高三'],
    intro: '985 硕士，主讲高中数学压轴题与物理大题规范，善于把难题拆解成可执行步骤。',
    mode: ['在线', '上门'],
    rating: 4.7,
    taughtHours: 3900,
    tags: ['985硕士', '压轴题', '方法派'],
  },
  {
    id: 7,
    name: '孙老师',
    gender: '女',
    subjects: ['英语', '语文'],
    grades: ['小学'],
    intro: '小学低年级启蒙专家，拼音/识字/自然拼读体系化教学，温柔有耐心，孩子都喜欢她。',
    mode: ['上门'],
    rating: 4.9,
    taughtHours: 2800,
    tags: ['启蒙专家', '幼小衔接', '好评多'],
  },
  {
    id: 8,
    name: '周老师',
    gender: '男',
    subjects: ['历史', '政治', '地理'],
    grades: ['初一', '初二', '初三', '高一', '高二', '高三'],
    intro: '文综三科通讲，擅长知识框架梳理与时事结合，艺考生文化课提分经验丰富。',
    mode: ['在线', '上门'],
    rating: 4.7,
    taughtHours: 4700,
    tags: ['文综', '艺考文化课', '框架梳理'],
  },
  {
    id: 9,
    name: '吴老师',
    gender: '女',
    subjects: ['数学', '化学', '生物'],
    grades: ['高一', '高二', '高三'],
    intro: '选科「物化生」组合辅导经验丰富，兼顾三科节奏规划，帮助多名学生考入 985/211。',
    mode: ['上门', '在线'],
    rating: 4.9,
    taughtHours: 8300,
    tags: ['选科规划', '985率', '责任心强'],
  },
]
