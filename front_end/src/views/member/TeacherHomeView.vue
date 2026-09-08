<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import { decodeSubjects, scheduleSummary } from '@/utils/availability'
import { gradeLabel } from '@/data/tutors'
import type { StudentAccount } from '@/types'

/** 老师工作台：查看入驻资料 + 选择学生（学生也可反向选择老师，双向即匹配） */

const store = useSystemStore()

const me = computed(() => (store.current?.role === 'teacher' ? store.current : null))
const rels = computed(() => (me.value ? store.relationsOfTeacher(me.value.phone) : []))

const mySubjects = computed(() => (me.value ? decodeSubjects(me.value.subjects) : []))
const myGrade = computed(() => (me.value ? gradeLabel(me.value.grade) : ''))
const myScheduleText = computed(() => {
  if (!me.value) return ''
  const busy = scheduleSummary(me.value.availability).filter((s) => !s.includes('无空闲'))
  return busy.length ? busy.join('；') : '未填写空余时间'
})

const chosenByMe = computed(() => new Set(rels.value.filter((r) => r.by === 'teacher').map((r) => r.studentPhone)))
const chosenMe = computed(() => new Set(rels.value.filter((r) => r.by === 'student').map((r) => r.studentPhone)))
const matchedCount = computed(() => [...chosenByMe.value].filter((u) => chosenMe.value.has(u)).length)

function stateOf(s: StudentAccount) {
  const byMe = chosenByMe.value.has(s.phone)
  const byStudent = chosenMe.value.has(s.phone)
  return { byMe, byStudent, mutual: byMe && byStudent }
}

/** 学生空余时间摘要（最多展示 3 天，其余折叠） */
function scheduleText(availability?: number[]): string {
  const busy = scheduleSummary(availability).filter((x) => !x.includes('无空闲'))
  if (!busy.length) return '未填写'
  return busy.length > 3 ? `${busy.slice(0, 3).join('；')} 等` : busy.join('；')
}

function toggle(s: StudentAccount) {
  try {
    store.toggleSelect(s.phone, 'teacher')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}
</script>

<template>
  <div class="member-page">
    <el-alert
      class="demo-tip"
      title="当前为前端演示模式：账号与选择关系保存在本浏览器 localStorage，接入后端后自动切换为真实数据。"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 欢迎 + 我的资料 -->
    <section v-if="me" class="welcome">
      <div class="welcome-main">
        <div class="welcome-avatar">{{ me.name.slice(0, 1) }}</div>
        <div>
          <h2 class="welcome-title">{{ me.name }}老师，欢迎回来 👋</h2>
          <p class="welcome-sub">
            手机号：{{ me.phone }}
          </p>
          <p class="welcome-tags">
            <el-tag v-for="s in mySubjects" :key="s" size="small" effect="plain">{{ s }}</el-tag>
            <el-tag v-if="myGrade" size="small" type="success" effect="plain">{{ myGrade }}</el-tag>
          </p>
          <p class="welcome-sched">空余时间：{{ myScheduleText }}</p>
        </div>
      </div>
      <div class="welcome-stats">
        <div class="stat">
          <b>{{ chosenByMe.size }}</b><span>我选择的学生</span>
        </div>
        <div class="stat">
          <b>{{ chosenMe.size }}</b><span>选择我的学生</span>
        </div>
        <div class="stat stat--match">
          <b>{{ matchedCount }}</b><span>已匹配</span>
        </div>
      </div>
    </section>

    <!-- 学生池：老师选学生 -->
    <section class="section">
      <div class="section-head">
        <h3 class="section-title">学生列表 · 选择想带的学生</h3>
        <p class="section-desc">学生对你的选择会显示在卡片上；双方互选即视为匹配成功。</p>
      </div>

      <div v-if="store.students.length" class="card-grid">
        <article v-for="s in store.students" :key="s.phone" class="person-card">
          <header class="person-head">
            <div class="person-avatar">{{ s.name.slice(0, 1) }}</div>
            <div>
              <h4 class="person-name">{{ s.name }}<span class="person-role">学生</span></h4>
              <p class="person-meta">{{ gradeLabel(s.grade) }} · {{ decodeSubjects(s.subjects).join('、') || '未选科目' }}</p>
              <p class="person-sched">空闲：{{ scheduleText(s.availability) }}</p>
            </div>
          </header>
          <p v-if="s.note" class="person-note">备注：{{ s.note }}</p>

          <footer class="person-foot">
            <div class="person-tags">
              <el-tag v-if="stateOf(s).byMe" size="small">我选择了 TA</el-tag>
              <el-tag v-if="stateOf(s).byStudent" size="small" type="warning">TA 选择了我</el-tag>
              <el-tag v-if="stateOf(s).mutual" size="small" type="success" effect="dark">✓ 已匹配</el-tag>
            </div>
            <el-button
              v-if="!stateOf(s).mutual"
              size="small"
              :type="stateOf(s).byMe ? 'default' : 'primary'"
              round
              @click="toggle(s)"
            >
              {{ stateOf(s).byMe ? '取消选择' : stateOf(s).byStudent ? '接受 TA · 选择 TA' : '选择 TA' }}
            </el-button>
            <el-button v-else size="small" type="success" round disabled>已匹配</el-button>
          </footer>
        </article>
      </div>
      <el-empty v-else description="暂无入驻学生" />
    </section>
  </div>
</template>

<style scoped>
.member-page {
  padding: 32px 0 72px;
  background: var(--bg-subtle);
  min-height: 60vh;
}

.member-page :deep(.container) {
  /* 页面自带留白容器由父级 Portal 提供 */
}

.demo-tip {
  max-width: var(--container-width);
  margin: 0 auto 18px;
  width: calc(100% - 32px);
}

.welcome {
  max-width: var(--container-width);
  margin: 0 auto 26px;
  width: calc(100% - 32px);
  background: var(--brand-gradient);
  border-radius: var(--radius-lg);
  color: #fff;
  padding: 26px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  box-shadow: var(--shadow-md);
}

.welcome-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-title {
  font-size: 21px;
}

.welcome-sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
}

.welcome-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.welcome-tags :deep(.el-tag) {
  background: rgba(255, 255, 255, 0.92);
}

.welcome-sched {
  margin-top: 8px;
  font-size: 12.5px;
  opacity: 0.92;
  max-width: 640px;
}

.welcome-stats {
  display: flex;
  gap: 12px;
}

.stat {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 10px 18px;
  text-align: center;
  min-width: 86px;
}

.stat b {
  display: block;
  font-size: 22px;
}

.stat span {
  font-size: 12px;
  opacity: 0.9;
}

.stat--match {
  background: rgba(255, 255, 255, 0.95);
  color: var(--brand-color-dark);
}

.section {
  max-width: var(--container-width);
  margin: 0 auto;
  width: calc(100% - 32px);
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 24px 26px;
}

.section-head {
  margin-bottom: 18px;
}

.section-title {
  font-size: 17px;
  color: var(--text-main);
}

.section-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.person-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.person-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}

.person-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.person-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--brand-color-light);
  color: var(--brand-color-dark);
  font-size: 19px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.person-name {
  font-size: 16px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.person-role {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
  padding: 1px 6px;
  border-radius: 999px;
}

.person-meta {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.person-sched {
  margin-top: 6px;
  font-size: 12px;
  color: var(--brand-color-dark);
  background: var(--brand-color-light);
  border-radius: 8px;
  padding: 6px 10px;
  line-height: 1.6;
}

.person-note {
  font-size: 12.5px;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border-radius: 8px;
  padding: 8px 10px;
}

.person-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.person-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
</style>
