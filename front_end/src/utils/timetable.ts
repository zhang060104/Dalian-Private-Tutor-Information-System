// 时间表编解码：timeTable1..7 各为一个 int，低 24 位代表一天 24 个整点小时
// timeTable1=周一 … timeTable7=周日；第 i 位为 1 → 当天 i:00~i+1:00 空余
import type { WeekTimeTables } from '@/types'

export const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export const HOURS = 24

/** 单日 int 掩码 → 空余的小时下标数组 */
export function decodeDay(mask: number): number[] {
  const out: number[] = []
  for (let i = 0; i < HOURS; i++) if (mask & (1 << i)) out.push(i)
  return out
}

/** 单日 → 该小时是否空余 */
export function hasHour(mask: number, hour: number): boolean {
  return (mask & (1 << hour)) !== 0
}

/** 整个星期 → 一周内是否有任何空余 */
export function anyFree(tables: WeekTimeTables): boolean {
  return tables.some((m) => m !== 0)
}

/** 格式化一天的空余为「HH:00-HH:00」片段 */
export function formatDay(mask: number): string[] {
  return decodeDay(mask).map((h) => `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`)
}

/** 星期可读摘要：只列有空余的天 */
export function timetableSummary(tables: WeekTimeTables): { day: string; slots: string[] }[] {
  return tables.map((m, i) => ({ day: DAYS[i], slots: formatDay(m) })).filter((d) => d.slots.length > 0)
}

/** 一周总空余小时数 */
export function totalFreeHours(tables: WeekTimeTables): number {
  return tables.reduce((acc, m) => acc + decodeDay(m).length, 0)
}
