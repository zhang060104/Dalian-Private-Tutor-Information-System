<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import { GRADE_LEVELS, SUBJECT_OPTIONS, gradeLabel } from '@/data/tutors'
import { decodeSubjects, encodeSubjects, scheduleSummary } from '@/utils/availability'
import type { ProfileReviewField, StudentAccount } from '@/types'

/** 老师工作台：查看入驻资料 + 选择学生；资料修改需管理员审核 */

const store = useSystemStore()

onMounted(() => {
  store.loadAll().catch(() => {})
  store.loadMyReview().catch(() => {})
})

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

/* ---------------- 个人资料展示 / 修改（管理员审核制） ---------------- */

const pending = computed(() => (me.value ? store.myReview : null))

function fmtTime(iso: string): string {
  return iso ? new Date(iso).toLocaleString('zh-CN') : ''
}

const editVisible = ref(false)
const submitting = ref(false)
const form = reactive({
  name: '',
  gender: '男' as '男' | '女',
  grade: 0,
  subjects: [] as string[],
  intro: '',
  availability: [] as number[],
})

function openEdit() {
  if (!me.value) return
  form.name = me.value.name
  form.gender = me.value.gender
  form.grade = me.value.grade
  form.subjects = decodeSubjects(me.value.subjects)
  form.intro = me.value.intro
  form.availability = [...me.value.availability]
  editVisible.value = true
}

async function submitEdit() {
  if (!me.value) return
  if (!form.name.trim()) return ElMessage.warning('请填写姓名')
  if (!form.subjects.length) return ElMessage.warning('请至少选择一个主教科目')

  const nextSubjects = encodeSubjects(form.subjects)
  const fields: ProfileReviewField[] = []
  const push = (label: string, o: string, n: string) => {
    if (o !== n) fields.push({ label, old: o || '未填写', next: n || '未填写' })
  }
  push('姓名', me.value.name, form.name.trim())
  push('性别', me.value.gender, form.gender)
  push('可授年级', gradeLabel(me.value.grade), gradeLabel(form.grade))
  push('主教科目', decodeSubjects(me.value.subjects).join('、'), decodeSubjects(nextSubjects).join('、'))
  push('个人简介', me.value.intro, form.intro.trim())
  push('空余时间', scheduleText(me.value.availability), scheduleText(form.availability))
  if (!fields.length) {
    ElMessage.info('资料没有任何改动')
    return
  }

  const profile: Record<string, unknown> = {
    nickname: form.name.trim(),
    gender: form.gender,
    grade: form.grade,
    subject: nextSubjects,
    description: form.intro.trim(),
  }
  form.availability.forEach((v, i) => {
    profile[`timeTable${i + 1}`] = v
  })

  submitting.value = true
  try {
    await store.submitProfileReview(profile, fields)
    ElMessage.success('修改申请已提交，等待管理员审核')
    editVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function cancelPending() {
  if (!pending.value) return
  try {
    await ElMessageBox.confirm('确定撤销这份资料修改申请吗？撤销后需重新填写提交。', '撤销申请', {
      type: 'warning',
      confirmButtonText: '撤销申请',
      cancelButtonText: '再想想',
    })
  } catch {
    return
  }
  try {
    await store.cancelMyReview()
    ElMessage.success('已撤销申请')
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

    <!-- 我的资料（对外展示；修改需管理员审核） -->
    <section v-if="me" class="section">
      <div class="section-head">
        <h3 class="section-title">我的资料</h3>
        <p class="section-desc">
          以下资料对学生与管理员可见。修改需提交管理员审核，<b>审核通过前仍展示当前资料</b>。
        </p>
      </div>

      <el-alert
        v-if="pending"
        class="pending-tip"
        :title="`资料修改申请审核中（提交于 ${fmtTime(pending.submittedAt)}），通过后新资料才会生效。`"
        type="warning"
        :closable="false"
        show-icon
      >
        <el-button link type="danger" @click="cancelPending">撤销申请</el-button>
      </el-alert>

      <el-descriptions :column="2" border class="profile-desc">
        <el-descriptions-item label="姓名">{{ me.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ me.gender }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ me.phone }}</el-descriptions-item>
        <el-descriptions-item label="可授年级">{{ myGrade }}</el-descriptions-item>
        <el-descriptions-item label="主教科目">{{ mySubjects.join('、') || '未选' }}</el-descriptions-item>
        <el-descriptions-item label="个人简介">{{ me.intro || '—' }}</el-descriptions-item>
        <el-descriptions-item label="我的空余时间" :span="2">{{ myScheduleText }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-actions">
        <el-button type="primary" round :disabled="!!pending" @click="openEdit">
          {{ pending ? '等待管理员审核' : '修改资料（需管理员审核）' }}
        </el-button>
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

  <!-- 修改资料对话框 -->
  <el-dialog v-model="editVisible" title="修改个人资料" width="680px" top="6vh" :close-on-click-modal="false">
    <el-form label-width="96px" class="edit-form">
      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="真实姓名" maxlength="20" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="form.gender">
          <el-radio-button value="男">男</el-radio-button>
          <el-radio-button value="女">女</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="可授年级">
        <el-select v-model="form.grade" placeholder="选择年级" style="width: 240px">
          <el-option v-for="g in GRADE_LEVELS" :key="g.value" :label="g.label" :value="g.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="主教科目">
        <el-select
          v-model="form.subjects"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="可多选"
          style="width: 420px"
        >
          <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="个人简介">
        <el-input
          v-model="form.intro"
          type="textarea"
          :rows="3"
          placeholder="教学经历、擅长领域等（选填）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="空余时间">
        <ScheduleEditor v-model="form.availability" />
      </el-form-item>
    </el-form>
    <p class="edit-tip">提交后将由管理员审核，审核通过前对外展示的资料保持不变。</p>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitEdit">提交审核</el-button>
    </template>
  </el-dialog>
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

/* ---------- 我的资料 ---------- */

.pending-tip {
  margin-bottom: 14px;
}

.profile-desc {
  background: var(--bg-primary, #fff);
}

.section-actions {
  margin-top: 18px;
}

.edit-tip {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-secondary);
}
</style>
