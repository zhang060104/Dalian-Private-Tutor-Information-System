<script setup lang="ts">
import { computed } from 'vue'
import { DAY_LABELS, HOUR_MASK_24, dayRanges } from '@/utils/availability'

/**
 * 一周空余时间编辑器（v-model: number[7]）
 *
 * 每个 int 的低 24 位表示当天 0-23 点的空闲情况：1=有空，0=没空。
 * 界面：周一~周日 × 0-23 点，点选切换（浅色=没空，深色=有空）。
 */

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ 'update:modelValue': [number[]] }>()

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const rangeText = computed(() =>
  DAY_LABELS.map((label, i) => `${label} ${dayRanges(props.modelValue[i] ?? 0) || '无空闲'}`),
)

function isOn(dayIdx: number, hour: number): boolean {
  return (((props.modelValue[dayIdx] ?? 0) >> hour) & 1) === 1
}

function toggle(dayIdx: number, hour: number) {
  const next = [...props.modelValue]
  const cur = (next[dayIdx] ?? 0) & HOUR_MASK_24
  next[dayIdx] = (cur ^ (1 << hour)) & HOUR_MASK_24
  emit('update:modelValue', next)
}

/** 快捷填充：工作日 8-18 点 + 周末 9-17 点 */
function fillCommon() {
  const work = Array.from({ length: 11 }, (_, i) => i + 8) // 8..18
  const rest = Array.from({ length: 9 }, (_, i) => i + 9) // 9..17
  const build = (hours: number[]) => hours.reduce((v, h) => v | (1 << h), 0)
  const w = build(work)
  const r = build(rest)
  emit('update:modelValue', [w, w, w, w, w, r, r])
}

function clearAll() {
  emit('update:modelValue', [0, 0, 0, 0, 0, 0, 0])
}
</script>

<template>
  <div class="sched">
    <div class="sched-toolbar">
      <span class="sched-hint">点击格子设置空闲时段：<i class="dot on" />有空 &nbsp;<i class="dot" />没空</span>
      <div class="sched-actions">
        <el-button size="small" round @click="fillCommon">工作日 8-18 / 周末 9-17</el-button>
        <el-button size="small" round plain @click="clearAll">清空</el-button>
      </div>
    </div>

    <div class="sched-scroll">
      <div class="sched-grid">
        <!-- 表头：小时 -->
        <div class="sched-row sched-row--head">
          <span class="sched-day" />
          <span v-for="h in HOURS" :key="h" class="sched-hour" :title="`${String(h).padStart(2, '0')}:00`">
            {{ h }}
          </span>
        </div>

        <!-- 每天一行 -->
        <div v-for="(label, d) in DAY_LABELS" :key="label" class="sched-row">
          <span class="sched-day">{{ label }}</span>
          <button
            v-for="h in HOURS"
            :key="h"
            type="button"
            class="sched-cell"
            :class="{ on: isOn(d, h) }"
            :title="`${label} ${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`"
            @click="toggle(d, h)"
          />
        </div>
      </div>
    </div>

    <p class="sched-summary">{{ rangeText.join('　') }}</p>
  </div>
</template>

<style scoped>
.sched {
  width: 100%;
}

.sched-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.sched-hint {
  font-size: 12.5px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: #e6eaf2;
  border: 1px solid var(--border-strong);
}

.dot.on {
  background: var(--brand-color);
  border-color: var(--brand-color);
}

.sched-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}

.sched-grid {
  min-width: 620px;
}

.sched-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 3px;
}

.sched-row--head {
  margin-bottom: 6px;
}

.sched-day {
  width: 52px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.sched-hour {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  font-size: 10px;
  color: var(--text-tertiary);
}

.sched-cell {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  padding: 0;
  transition: background 0.1s, border-color 0.1s;
}

.sched-cell:hover {
  border-color: var(--brand-color);
}

.sched-cell.on {
  background: var(--brand-color);
  border-color: var(--brand-color);
}

.sched-summary {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.9;
}
</style>
