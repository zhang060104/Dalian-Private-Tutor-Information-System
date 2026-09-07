<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import { decodeGrades, decodeSubjects, scheduleSummary } from '@/utils/availability'
import type { TeacherAccount } from '@/types'

/** 学生空间：查看自己的资料 + 选择老师（老师也可反向选择学生，双向即匹配） */

const store = useSystemStore()

const me = computed(() => (store.current?.role === 'student' ? store.current : null))
const rels = computed(() => (me.value ? store.relationsOfStudent(me.value.username) : []))

const mySubjects = computed(() => (me.value ? decodeSubjects(me.value.subjects) : []))
const myScheduleText = computed(() => {
  if (!me.value) return ''
  const busy = scheduleSummary(me.value.availability).filter((s) => !s.includes('无空闲'))
  return busy.length ? busy.join('；') : '未填写空余时间'
})

const chosenByMe = computed(() => new Set(rels.value.filter((r) => r.by === 'student').map((r) => r.teacherUsername)))
const chosenMe = computed(() => new Set(rels.value.filter((r) => r.by === 'teacher').map((r) => r.teacherUsername)))
const matchedCount = computed(() => [...chosenByMe.value].filter((u) => chosenMe.value.has(u)).length)

/** 老师空余时间摘要（最多 3 天） */
function teacherScheduleText(availability?: number[]): string {
  const busy = scheduleSummary(availability).filter((x) => !x.includes('无空闲'))
  if (!busy.length) return '未填写'
  return busy.length > 3 ? `${busy.slice(0, 3).join('；')} 等` : busy.join('；')
}

function stateOf(t: TeacherAccount) {
  const byMe = chosenByMe.value.has(t.username)
  const byTeacher = chosenMe.value.has(t.username)
  return { byMe, byTeacher, mutual: byMe && byTeacher }
}

function toggle(t: TeacherAccount) {
  try {
    store.toggleSelect(t.username, 'student')
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
          <h2 class="welcome-title">{{ me.name }}，欢迎回来 👋</h2>
          <p class="welcome-sub">
            账号：{{ me.username }} · {{ me.grade }} · 辅导科目：{{ mySubjects.join('、') || '未选' }} · {{ me.guardian }}
          </p>
          <p v-if="me.note" class="welcome-note">备注：{{ me.note }}</p>
          <p class="welcome-sched">我的空余时间：{{ myScheduleText }}</p>
        </div>
      </div>
      <div class="welcome-stats">
        <div class="stat">
          <b>{{ chosenByMe.size }}</b><span>我选择的老师</span>
        </div>
        <div class="stat">
          <b>{{ chosenMe.size }}</b><span>选择我的老师</span>
        </div>
        <div class="stat stat--match">
          <b>{{ matchedCount }}</b><span>已匹配</span>
        </div>
      </div>
    </section>

    <!-- 老师池：学生选老师 -->
    <section class="section">
      <div class="section-head">
        <h3 class="section-title">老师列表 · 选择心仪的老师</h3>
        <p class="section-desc">老师对你的选择会显示在卡片上；双方互选即视为匹配成功，可联系试听。</p>
      </div>

      <div v-if="store.teachers.length" class="card-grid">
        <article v-for="t in store.teachers" :key="t.username" class="person-card">
          <header class="person-head">
            <div class="person-avatar">{{ t.name.slice(0, 1) }}</div>
            <div>
              <h4 class="person-name">
                {{ t.name }}老师
                <el-tag v-if="stateOf(t).mutual" size="small" type="success" effect="dark">✓ 已匹配</el-tag>
              </h4>
              <p class="person-meta">
                {{ t.gender }}
              </p>
            </div>
          </header>

          <p class="person-intro">{{ t.intro }}</p>
          <p class="person-sched">可约时间：{{ teacherScheduleText(t.availability) }}</p>

          <div class="person-skills">
            <el-tag v-for="s in decodeSubjects(t.subjects)" :key="s" size="small" effect="plain">{{ s }}</el-tag>
            <el-tag v-for="g in decodeGrades(t.grades)" :key="g" size="small" type="success" effect="plain">{{ g }}</el-tag>
          </div>

          <footer class="person-foot">
            <div class="person-tags">
              <el-tag v-if="stateOf(t).byMe" size="small">我选择了 TA</el-tag>
              <el-tag v-if="stateOf(t).byTeacher" size="small" type="warning">TA 选择了我</el-tag>
            </div>
            <el-button
              v-if="!stateOf(t).mutual"
              size="small"
              :type="stateOf(t).byMe ? 'default' : 'primary'"
              round
              @click="toggle(t)"
            >
              {{ stateOf(t).byMe ? '取消选择' : stateOf(t).byTeacher ? '接受 TA · 选择 TA' : '选择这位老师' }}
            </el-button>
            <el-button v-else size="small" type="success" round disabled>已匹配</el-button>
          </footer>
        </article>
      </div>
      <el-empty v-else description="暂无入驻老师" />
    </section>
  </div>
</template>

<style scoped>
.member-page {
  padding: 32px 0 72px;
  background: var(--bg-subtle);
  min-height: 60vh;
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

.welcome-note {
  margin-top: 6px;
  font-size: 12.5px;
  opacity: 0.85;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

.person-meta {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.person-intro {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.person-sched {
  font-size: 12px;
  color: var(--brand-color-dark);
  background: var(--brand-color-light);
  border-radius: 8px;
  padding: 6px 10px;
  line-height: 1.6;
}

.person-skills {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.person-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

.person-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
</style>
