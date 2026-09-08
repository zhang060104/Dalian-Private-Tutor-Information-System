/**
 * 空余时间 / 选项集合 的「整数位掩码」编解码工具
 *
 * 一、一周空余时间（WeekAvailability）
 * - 结构：number[7]，下标 0=周一 … 6=周日
 * - 每个 int 解码为二进制后取**低 24 位**为有效数据（高 8 位忽略）
 * - 第 h 位 = 1 表示 h:00 – h+1:00 空闲（1=有空，0=没空），h ∈ [0, 23]
 *
 * 二、选项集合位掩码（科目 / 年级等，与空余时间同一思路）
 * - options 列表第 i 项被选中 ⇔ 掩码第 i 位 = 1
 */

import { SUBJECT_OPTIONS } from '@/data/tutors'

export const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

/** 24 小时全 1 掩码（低 24 位有效） */
export const HOUR_MASK_24 = 0xffffff

/** 每天空闲的小时下标（int → 二进制低 24 位逐位解析，1=有空） */
export function availableHours(dayInt: number): number[] {
  const hours: number[] = []
  const v = (dayInt | 0) & HOUR_MASK_24
  for (let h = 0; h < 24; h++) {
    if ((v >> h) & 1) hours.push(h)
  }
  return hours
}

/** 每天空闲的 24 位二进制字符串（首位=0 点，1=有空），供调试/展示 */
export function dayBits(dayInt: number): string {
  return Array.from({ length: 24 }, (_, h) => (((dayInt | 0) >> h) & 1 ? '1' : '0')).join('')
}

/** 小时下标集合 → 单日 int（自动去重、越界剔除、只保留低 24 位） */
export function encodeDay(hours: number[]): number {
  let v = 0
  for (const h of hours) {
    const x = Math.trunc(h)
    if (x >= 0 && x < 24) v |= 1 << x
  }
  return v & HOUR_MASK_24
}

/** 单日空闲小时 → 连续区间文本，如 [8,9,10,14,15] → '08:00-11:00, 14:00-16:00' */
export function dayRanges(dayInt: number): string {
  const hours = availableHours(dayInt)
  if (!hours.length) return ''
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`
  const parts: string[] = []
  let start = hours[0]
  let prev = hours[0]
  for (let i = 1; i <= hours.length; i++) {
    const cur = hours[i]
    if (i === hours.length || cur !== prev + 1) {
      parts.push(`${fmt(start)}-${fmt(prev + 1)}`)
      start = cur
    }
    prev = cur
  }
  return parts.join(', ')
}

/** 一周空余时间 → 每天一行摘要；空数组/未设置 → '未填写' */
export function scheduleSummary(availability?: WeekAvailabilityLike): string[] {
  const list = Array.isArray(availability) ? availability : []
  return DAY_LABELS.map((label, i) => {
    const v = typeof list[i] === 'number' ? (list[i] as number) : 0
    const ranges = dayRanges(v)
    return `${label} ${ranges || '无空闲'}`
  })
}

type WeekAvailabilityLike = number[] | null | undefined

/* ---------------- 选项集合位掩码（科目 / 年级） ---------------- */

/** 掩码 → 选中的选项文本列表 */
export function decodeOptions(mask: number, options: readonly string[]): string[] {
  const v = mask | 0
  const picked: string[] = []
  options.forEach((label, i) => {
    if ((v >> i) & 1) picked.push(label)
  })
  return picked
}

/** 选项文本集合 → 掩码（无法识别的文本会被忽略） */
export function encodeOptions(labels: string[], options: readonly string[]): number {
  let v = 0
  for (const label of labels) {
    const i = options.indexOf(label)
    if (i >= 0) v |= 1 << i
  }
  return v
}

/** 便捷方法：科目掩码 → 文本 */
export function decodeSubjects(mask: number): string[] {
  return decodeOptions(mask, SUBJECT_OPTIONS)
}

/** 便捷方法：科目文本 → 掩码 */
export function encodeSubjects(labels: string[]): number {
  return encodeOptions(labels, SUBJECT_OPTIONS)
}
