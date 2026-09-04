<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { GRADE_OPTIONS, SUBJECT_OPTIONS, TUTORS } from '@/data/tutors'
import type { Tutor } from '@/types'
import TutorCard from '@/components/TutorCard.vue'

type SortKey = 'default' | 'rating' | 'price-asc' | 'price-desc' | 'years'

const filters = reactive<{ subject: string; grade: string; mode: string; keyword: string }>({
  subject: '',
  grade: '',
  mode: '',
  keyword: '',
})

const sortKey = ref<SortKey>('default')

const MODE_OPTIONS = ['上门', '在线'] as const

const filtered = computed<Tutor[]>(() => {
  const kw = filters.keyword.trim().toLowerCase()
  let list = TUTORS.filter((t) => {
    if (filters.subject && !t.subjects.includes(filters.subject)) return false
    if (filters.grade && !t.grades.includes(filters.grade)) return false
    if (filters.mode && !t.mode.includes(filters.mode as Tutor['mode'][number])) return false
    if (kw) {
      const haystack = [t.name, t.subjects.join(''), t.education, t.intro, t.tags.join('')].join('').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })

  switch (sortKey.value) {
    case 'rating':
      list = [...list].sort((a, b) => b.rating - a.rating)
      break
    case 'price-asc':
      list = [...list].sort((a, b) => a.pricePerHour - b.pricePerHour)
      break
    case 'price-desc':
      list = [...list].sort((a, b) => b.pricePerHour - a.pricePerHour)
      break
    case 'years':
      list = [...list].sort((a, b) => b.years - a.years)
      break
  }
  return list
})

function resetFilters() {
  filters.subject = ''
  filters.grade = ''
  filters.mode = ''
  filters.keyword = ''
  sortKey.value = 'default'
}
</script>

<template>
  <div class="tutors-page">
    <!-- 页头 -->
    <div class="page-hero">
      <div class="container">
        <h1 class="page-title">教员库</h1>
        <p class="page-sub">
          全部教员均通过学历核验 · 经验背调 · 现场试讲三重审核。当前展示
          <strong>{{ filtered.length }}</strong>
          位（示例数据，正式师资以中心公示为准）。
        </p>
      </div>
    </div>

    <div class="container page-body">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select v-model="filters.subject" placeholder="辅导科目" clearable class="filter-item" style="width: 170px">
          <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filters.grade" placeholder="学生年级" clearable class="filter-item" style="width: 150px">
          <el-option v-for="g in GRADE_OPTIONS" :key="g" :label="g" :value="g" />
        </el-select>
        <el-select v-model="filters.mode" placeholder="授课方式" clearable class="filter-item" style="width: 150px">
          <el-option v-for="m in MODE_OPTIONS" :key="m" :label="m" :value="m" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="搜索老师 / 科目 / 学校…"
          clearable
          class="filter-item search-input"
          :prefix-icon="Search"
        />
        <el-select v-model="sortKey" class="filter-item" style="width: 150px">
          <el-option label="默认排序" value="default" />
          <el-option label="评分最高" value="rating" />
          <el-option label="课时费 ↑" value="price-asc" />
          <el-option label="课时费 ↓" value="price-desc" />
          <el-option label="教龄最长" value="years" />
        </el-select>
        <el-button :icon="RefreshLeft" circle title="重置筛选" @click="resetFilters" />
      </div>

      <!-- 教员网格 -->
      <div v-if="filtered.length" class="tutor-grid">
        <TutorCard v-for="t in filtered" :key="t.id" :tutor="t" />
      </div>
      <el-empty v-else description="没有符合条件的教员，试试重置筛选条件" />

      <!-- 提示条 -->
      <el-alert
        class="notice-bar"
        type="info"
        :closable="false"
        show-icon
        title="以上为网站初始化示例师资。如需预约试听或咨询真实教员排期，请通过「找家教」提交需求。"
      />
    </div>
  </div>
</template>

<style scoped>
.page-hero {
  background:
    radial-gradient(700px 300px at 90% 0%, rgba(47, 124, 246, 0.14), transparent 60%),
    linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
  border-bottom: 1px solid var(--border-color);
  padding: 52px 0 44px;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 10px;
}

.page-sub {
  color: var(--text-secondary);
  font-size: 15px;
}

.page-body {
  padding-top: 28px;
  padding-bottom: 64px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}

.search-input {
  width: 220px;
}

.tutor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-bottom: 28px;
}

.notice-bar {
  border-radius: var(--radius-sm);
}

@media (max-width: 960px) {
  .tutor-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .tutor-grid {
    grid-template-columns: 1fr;
  }

  .search-input {
    width: 100%;
  }
}
</style>
