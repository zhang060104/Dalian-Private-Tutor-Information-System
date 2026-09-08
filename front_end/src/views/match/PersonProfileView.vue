<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import { gradeLabel } from '@/data/tutors'
import { decodeSubjects, DAY_LABELS, availableHours, dayRanges } from '@/utils/availability'
import type { StudentAccount, TeacherAccount } from '@/types'

/**
 * 单一个人资料页（老师 / 学生）——只展示这一位的信息，不掺任何列表。
 * 路由：/person/:role/:id
 */

const store = useSystemStore()
const route = useRoute()
const router = useRouter()

const roleParam = computed(() => (route.params.role === 'student' ? 'student' : 'teacher'))
const idParam = computed(() => Number(route.params.id))

onMounted(() => {
  if (!store.teachers.length && !store.students.length) store.loadAll().catch(() => {})
})

const person = computed<TeacherAccount | StudentAccount | null>(() => {
  const id = idParam.value
  return roleParam.value === 'teacher'
    ? store.teachers.find((t) => t.id === id) ?? null
    : store.students.find((s) => s.id === id) ?? null
})

const myRole = computed(() => (store.current?.role === 'teacher' || store.current?.role === 'student' ? store.current.role : null))

/** 我能否对该对象投递简历（我在另一侧） */
const canApply = computed(() => {
  if (!person.value) return false
  if (myRole.value === 'teacher' && person.value.role === 'student') return true
  if (myRole.value === 'student' && person.value.role === 'teacher') return true
  return false
})

const applied = computed(() => {
  const p = person.value
  if (!p || !myRole.value) return false
  if (myRole.value === 'teacher' && p.role === 'student')
    return store.relations.some(
      (r) => r.teacherPhone === store.current?.phone && r.studentPhone === p.phone && r.by === 'teacher',
    )
  if (myRole.value === 'student' && p.role === 'teacher')
    return store.relations.some(
      (r) => r.teacherPhone === p.phone && r.studentPhone === store.current?.phone && r.by === 'student',
    )
  return false
})

const subjects = computed(() => (person.value ? decodeSubjects(person.value.subjects) : []))

/** 逐天空闲时段 */
function dayRangesLabel(p: TeacherAccount | StudentAccount, idx: number): string {
  const v = p.availability[idx] ?? 0
  const hours = availableHours(v)
  return hours.length ? dayRanges(v) : '无空闲'
}

const toggling = ref(false)
async function toggleApply() {
  const p = person.value
  if (!p || !myRole.value) return
  try {
    toggling.value = true
    await store.toggleSelect(p.phone, myRole.value)
    ElMessage.success(applied.value ? '已撤回投递' : '投递成功')
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    toggling.value = false
  }
}

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/match')
}
</script>

<template>
  <div class="person-page">
    <div class="container page-body">
      <el-button class="back" text :icon="ArrowLeft" @click="back">返回</el-button>

      <el-empty v-if="!person" description="未找到该用户资料" />
      <div v-else class="profile-card">
        <header class="head">
          <span class="avatar">{{ (person.name || '?').slice(0, 1) }}</span>
          <div class="head-main">
            <div class="name-row">
              <h1 class="name">{{ person.name }}</h1>
              <el-tag size="small" effect="plain" round>{{ person.role === 'teacher' ? '老师' : '学生' }}</el-tag>
              <el-tag size="small" type="warning" effect="light" round>信用分 {{ person.credit }}</el-tag>
            </div>
            <p class="sub">{{ person.role === 'teacher' ? '在线 / 上门家教老师' : '寻找家教的学员' }}</p>
          </div>
          <div v-if="canApply" class="head-actions">
            <el-button
              size="large"
              round
              :type="applied ? 'default' : 'primary'"
              :loading="toggling"
              @click="toggleApply"
            >
              {{ applied ? '撤回投递' : '投递简历' }}
            </el-button>
          </div>
        </header>

        <!-- 只展示这一位的信息，无任何列表 -->
        <section class="block">
          <h3 class="block-title">基本资料</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="性别">{{ person.gender }}</el-descriptions-item>
            <el-descriptions-item :label="person.role === 'teacher' ? '可授年级' : '在读年级'">
              {{ gradeLabel(person.grade) }}
            </el-descriptions-item>
            <el-descriptions-item :label="person.role === 'teacher' ? '主教科目' : '辅导科目'" :span="2">
              {{ subjects.join('、') || '未选' }}
            </el-descriptions-item>
            <el-descriptions-item label="信用分">{{ person.credit }}</el-descriptions-item>
            <el-descriptions-item label="注册账号">{{ person.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }}</el-descriptions-item>
            <el-descriptions-item label="个人简介" :span="2">
              {{ (person.role === 'teacher' ? person.intro : person.note) || '（暂无）' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="block">
          <h3 class="block-title">一周空余时间</h3>
          <div class="sched-table">
            <div v-for="(d, i) in DAY_LABELS" :key="d" class="sched-row">
              <span class="day">{{ d }}</span>
              <span class="time">{{ dayRangesLabel(person, i) }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.person-page {
  min-height: 62vh;
  padding: 24px 0 72px;
  background: var(--bg-subtle);
}

.page-body {
  max-width: 860px;
}

.back {
  margin-bottom: 16px;
}

.profile-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 28px 30px;
}

.head {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border-color);
}

.avatar {
  width: 66px;
  height: 66px;
  border-radius: 18px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.name {
  font-size: 22px;
  font-weight: 800;
}

.sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.block {
  margin-top: 24px;
}

.block-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text-main);
}

.sched-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sched-row {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
}

.day {
  width: 46px;
  color: var(--text-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

.time {
  color: var(--brand-color-dark);
  background: var(--brand-color-light);
  border-radius: 6px;
  padding: 4px 10px;
  flex: 1;
}
</style>
