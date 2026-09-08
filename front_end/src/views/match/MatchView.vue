<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import { gradeLabel } from '@/data/tutors'
import { decodeSubjects, scheduleSummary } from '@/utils/availability'
import type { StudentAccount, TeacherAccount } from '@/types'

/**
 * 双选大厅（登录后，老师/学生共用）
 *
 * 提供「老师」与「学生」两个池：任一角色都只对「另一侧」发起投递简历。
 * - 老师浏览学生 → 对自己能胜任的学生「投递简历」（老师发起）
 * - 学生浏览老师 → 对心仪老师「投递简历」（学生发起）
 * 卡片本身不带任何多余动作，点到详情页再细看；不在此列表里塞入奇怪文案。
 */

const store = useSystemStore()
const router = useRouter()

onMounted(() => {
  store.loadAll().catch(() => {})
})

const me = computed(() => store.current)
const myRole = computed(() => (me.value?.role === 'teacher' || me.value?.role === 'student' ? me.value.role : null))

/** 当前用户视角：只对「另一侧」发起投递 */
const canApply = computed(() => {
  if (myRole.value === 'teacher') return { targetRole: 'student' as const, label: '投递简历' }
  if (myRole.value === 'student') return { targetRole: 'teacher' as const, label: '投递简历' }
  return { targetRole: null as null, label: '' }
})

/** 我是否已对该对象发起了投递 */
function hasApplied(p: TeacherAccount | StudentAccount): boolean {
  if (!myRole.value) return false
  const rel = store.relations
  if (myRole.value === 'teacher' && p.role === 'student') {
    return rel.some((r) => r.teacherPhone === me.value?.phone && r.studentPhone === p.phone && r.by === 'teacher')
  }
  if (myRole.value === 'student' && p.role === 'teacher') {
    return rel.some((r) => r.teacherPhone === p.phone && r.studentPhone === me.value?.phone && r.by === 'student')
  }
  return false
}

const activeTab = ref<'teachers' | 'students'>('teachers')

/** 展示池（默认老师池，切换学生池） */
const shownPeople = computed<(TeacherAccount | StudentAccount)[]>(() => {
  if (activeTab.value === 'students') return store.students
  return store.teachers
})

function subjectsOf(p: TeacherAccount | StudentAccount): string[] {
  return decodeSubjects(p.subjects)
}

function schedText(p: TeacherAccount | StudentAccount): string {
  const busy = scheduleSummary(p.availability).filter((x) => !x.includes('无空闲'))
  return busy.length ? busy.join('；') : '未填写空余时间'
}

function openProfile(p: TeacherAccount | StudentAccount) {
  router.push(`/person/${p.role}/${p.id}`)
}

const toggling = ref(false)
async function toggleApply(p: TeacherAccount | StudentAccount) {
  if (!myRole.value || !canApply.value.targetRole || p.role !== canApply.value.targetRole) return
  const applied = hasApplied(p)
  try {
    toggling.value = true
    await store.toggleSelect(p.phone, myRole.value)
    ElMessage.success(applied ? '已撤回投递' : '投递成功')
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    toggling.value = false
  }
}

/** 头像底色 */
const AVATAR_COLORS = ['#2f7cf6', '#22c1a6', '#7c6ff0', '#f0a62f', '#e96f8a', '#3aa6dd', '#62b85c', '#b47ae8']
function avatarColor(p: TeacherAccount | StudentAccount): string {
  return AVATAR_COLORS[(p.id ?? 0) % AVATAR_COLORS.length]
}
</script>

<template>
  <div class="match-page">
    <div class="page-hero">
      <div class="container">
        <h1 class="page-title">双选大厅</h1>
        <p class="page-sub">
          {{ myRole === 'teacher' ? '你是老师，浏览学生并对合适的学生投递简历。' : '你是学生，浏览老师并对心仪的老师投递简历。' }}
        </p>
      </div>
    </div>

    <div class="container page-body">
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="`老师（${store.teachers.length}）`" name="teachers" />
        <el-tab-pane :label="`学生（${store.students.length}）`" name="students" />
      </el-tabs>

      <!-- 对方池提示：只有另一侧才可投递 -->
      <p class="pool-hint" v-if="canApply.targetRole">
        当前显示「{{ activeTab === 'teachers' ? '老师' : '学生' }}」，点击卡片查看完整资料；对合适的
        <b>{{ canApply.targetRole === 'teacher' ? '老师' : '学生' }}</b> 点击「投递简历」。
      </p>

      <div v-if="shownPeople.length" class="grid">
        <article v-for="p in shownPeople" :key="p.id" class="card" @click="openProfile(p)">
          <header class="card-head">
            <span class="avatar" :style="{ background: avatarColor(p) }">{{ (p.name || '?').slice(0, 1) }}</span>
            <div class="head-info">
              <div class="name-row">
                <span class="name">{{ p.name }}</span>
                <el-tag size="small" effect="plain" round>{{ p.role === 'teacher' ? '老师' : '学生' }}</el-tag>
                <el-tag size="small" type="warning" effect="light" round>信用分 {{ p.credit }}</el-tag>
              </div>
              <div class="meta">
                {{ gradeLabel(p.grade) }} · {{ subjectsOf(p).join('、') || '未选科目' }}
              </div>
            </div>
          </header>

          <p class="desc">{{ p.role === 'teacher' ? p.intro : p.note || '（无自我介绍）' }}</p>

          <p class="sched">空闲：{{ schedText(p) }}</p>

          <footer class="card-foot">
            <el-button size="small" text type="primary" @click.stop="openProfile(p)">查看完整资料</el-button>
            <!-- 仅对我能投递的那一侧显示操作 -->
            <el-button
              v-if="canApply.targetRole === p.role"
              size="small"
              round
              :type="hasApplied(p) ? 'default' : 'primary'"
              :loading="toggling"
              @click.stop="toggleApply(p)"
            >
              {{ hasApplied(p) ? '撤回投递' : canApply.label }}
            </el-button>
          </footer>
        </article>
      </div>
      <el-empty v-else description="暂无该类用户入驻" />
    </div>
  </div>
</template>

<style scoped>
.match-page {
  min-height: 60vh;
}

.page-hero {
  background:
    radial-gradient(700px 300px at 90% 0%, rgba(47, 124, 246, 0.14), transparent 60%),
    linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
  border-bottom: 1px solid var(--border-color);
  padding: 44px 0 34px;
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 8px;
}

.page-sub {
  color: var(--text-secondary);
  font-size: 15px;
}

.page-body {
  padding-top: 20px;
  padding-bottom: 72px;
}

.pool-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.card:hover {
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
  width: 46px;
  height: 46px;
  border-radius: 13px;
  color: #fff;
  font-size: 20px;
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
  flex-wrap: wrap;
}

.name {
  font-size: 16px;
  font-weight: 700;
}

.meta {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sched {
  font-size: 12px;
  color: var(--brand-color-dark);
  background: var(--brand-color-light);
  border-radius: 8px;
  padding: 6px 10px;
  line-height: 1.6;
}

.card-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--border-color);
  padding-top: 10px;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
