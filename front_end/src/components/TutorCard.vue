<script setup lang="ts">
import { computed } from 'vue'
import { StarFilled, Clock, Reading, Medal } from '@element-plus/icons-vue'
import type { Tutor } from '@/types'

const props = defineProps<{
  tutor: Tutor
}>()

/** 头像底色（按 id 取色，稳定且无需图片资源） */
const AVATAR_COLORS = ['#2f7cf6', '#22c1a6', '#7c6ff0', '#f0a62f', '#e96f8a', '#3aa6dd', '#62b85c', '#b47ae8']
const avatarColor = computed(() => AVATAR_COLORS[props.tutor.id % AVATAR_COLORS.length])
const avatarText = computed(() => props.tutor.name.slice(0, 1))
</script>

<template>
  <div class="tutor-card">
    <div class="card-head">
      <span class="avatar" :style="{ background: avatarColor }">{{ avatarText }}</span>
      <div class="head-info">
        <div class="name-row">
          <span class="name">{{ tutor.name }}</span>
          <el-tag size="small" type="success" effect="light" round>{{ tutor.gender }}</el-tag>
        </div>
        <div class="subjects">{{ tutor.subjects.join(' · ') }}</div>
      </div>
      <div class="rating">
        <el-icon color="#f5a623"><StarFilled /></el-icon>
        <span>{{ tutor.rating.toFixed(1) }}</span>
      </div>
    </div>

    <div class="meta-row">
      <span class="meta-item"><el-icon><Reading /></el-icon>{{ tutor.education }}</span>
      <span class="meta-item"><el-icon><Clock /></el-icon>教龄 {{ tutor.years }} 年</span>
      <span class="meta-item"><el-icon><Medal /></el-icon>授课 {{ (tutor.taughtHours / 100).toFixed(1) }}k+ 小时</span>
    </div>

    <p class="intro">{{ tutor.intro }}</p>

    <div class="grades">
      <el-tag v-for="g in tutor.grades.slice(0, 3)" :key="g" size="small" effect="plain" round>{{ g }}</el-tag>
      <el-tag v-if="tutor.grades.length > 3" size="small" effect="plain" round>
        +{{ tutor.grades.length - 3 }}
      </el-tag>
    </div>

    <div class="tags">
      <span v-for="tag in tutor.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div class="card-foot">
      <div class="price">
        <span class="price-num">¥{{ tutor.pricePerHour }}</span>
        <span class="price-unit">/小时起</span>
      </div>
      <div class="mode">
        <span v-for="m in tutor.mode" :key="m" class="mode-chip">{{ m }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tutor-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.tutor-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--brand-color-light);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 17px;
  font-weight: 700;
}

.subjects {
  font-size: 13px;
  color: var(--brand-color);
  margin-top: 2px;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
  font-size: 15px;
  color: var(--text-main);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.intro {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.grades {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 12px;
  color: var(--brand-color-dark);
  background: var(--brand-color-light);
  padding: 2px 10px;
  border-radius: 999px;
}

.card-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--border-color);
  padding-top: 12px;
}

.price-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--brand-color-dark);
}

.price-unit {
  font-size: 12px;
  color: var(--text-tertiary);
}

.mode {
  display: flex;
  gap: 6px;
}

.mode-chip {
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
  padding: 2px 8px;
  border-radius: 6px;
}
</style>
