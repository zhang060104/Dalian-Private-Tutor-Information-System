<script setup lang="ts">
// 7×24 时间表点选编辑器（用于注册/订单信息设定双方可用授课时间）
// 输出 WeekTimeTables：7 个 int，每 int 低 24 位，1=该小时选中
import { computed } from 'vue'
import type { WeekTimeTables } from '@/types'
import { DAYS, decodeDay } from '@/utils/timetable'

const props = defineProps<{ modelValue: WeekTimeTables }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: WeekTimeTables): void }>()

const rows = computed(() =>
  DAYS.map((day, d) => ({
    day,
    hours: Array.from({ length: 24 }, (_, h) => (props.modelValue[d] & (1 << h)) !== 0),
  })),
)

function toggle(d: number, h: number) {
  const next = [...props.modelValue] as number[]
  next[d] = props.modelValue[d] ^ (1 << h)
  emit('update:modelValue', next as WeekTimeTables)
}

const summary = computed(() => {
  const parts: string[] = []
  props.modelValue.forEach((m, d) => {
    if (!m) return
    const slots = decodeDay(m).map((h) => `${String(h).padStart(2, '0')}:00`)
    parts.push(`${DAYS[d]} ${slots.join(',')}`)
  })
  return parts.length ? parts.join('；') : '未选择任何空闲时段'
})
</script>

<template>
  <div class="editor">
    <div class="grid">
      <div v-for="(r, d) in rows" :key="d" class="day-row">
        <div class="day-label">{{ r.day }}</div>
        <div class="hours">
          <button
            v-for="h in 24"
            :key="h"
            type="button"
            class="cell"
            :class="{ on: r.hours[h - 1] }"
            :title="`${String(h - 1).padStart(2, '0')}:00`"
            @click="toggle(d, h - 1)"
          ></button>
        </div>
      </div>
      <div class="hour-scale">
        <span v-for="h in 24" :key="h">{{ (h - 1) % 6 === 0 ? String(h - 1).padStart(2, '0') : '' }}</span>
      </div>
    </div>
    <div class="legend">
      <span><i class="dot on"></i>已选</span>
      <span><i class="dot"></i>未选</span>
      <el-text size="small" type="info">点击方格切换该小时空闲</el-text>
    </div>
    <div class="summary muted">{{ summary }}</div>
  </div>
</template>

<style scoped>
.editor {
  width: 100%;
  overflow-x: auto;
}
.grid {
  min-width: 560px;
}
.day-row {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
}
.day-label {
  width: 40px;
  font-size: 12px;
  color: #606266;
  flex: none;
}
.hours {
  display: flex;
  gap: 2px;
}
.cell {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid #e2e6ee;
  background: #fff;
  cursor: pointer;
  padding: 0;
}
.cell.on {
  background: #2f7cf6;
  border-color: #2f7cf6;
}
.hour-scale {
  display: flex;
  gap: 2px;
  margin-left: 40px;
  margin-top: 2px;
}
.hour-scale span {
  width: 18px;
  font-size: 9px;
  color: #a3aab8;
  text-align: center;
}
.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #606266;
}
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid #e2e6ee;
  border-radius: 3px;
  vertical-align: -2px;
  margin-right: 4px;
}
.dot.on {
  background: #2f7cf6;
  border-color: #2f7cf6;
}
.summary {
  margin-top: 8px;
  font-size: 12px;
  max-height: 60px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
