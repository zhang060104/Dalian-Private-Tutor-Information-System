<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSystemStore } from '@/stores/system'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/data/tutors'
import { decodeSubjects, encodeSubjects, scheduleSummary } from '@/utils/availability'
import type { ProfileReviewField, StudentAccount } from '@/types'

/** 学生空间：查看自己的资料；修改需提交管理员审核，审核期间沿用当前资料 */

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

/* ---------------- 个人资料展示 / 修改（管理员审核制） ---------------- */

const pending = computed(() => (me.value ? store.pendingReviewOf(me.value.username) : undefined))

function fmtSched(availability?: number[]): string {
  const busy = scheduleSummary(availability).filter((s) => !s.includes('无空闲'))
  return busy.length ? busy.join('；') : '未填写'
}

const editVisible = ref(false)
const submitting = ref(false)
const form = reactive({
  name: '',
  gender: '男' as '男' | '女',
  phone: '',
  grade: '',
  subject: '',
  guardian: '',
  note: '',
  availability: [] as number[],
})

function openEdit() {
  if (!me.value) return
  form.name = me.value.name
  form.gender = me.value.gender
  form.phone = me.value.phone
  form.grade = me.value.grade
  form.subject = decodeSubjects(me.value.subjects)[0] ?? ''
  form.guardian = me.value.guardian
  form.note = me.value.note ?? ''
  form.availability = [...me.value.availability]
  editVisible.value = true
}

function submitEdit() {
  if (!me.value) return
  if (!form.name.trim()) return ElMessage.warning('请填写姓名')
  if (!form.phone.trim()) return ElMessage.warning('请填写联系电话')
  if (!form.grade) return ElMessage.warning('请选择年级')
  if (!form.subject) return ElMessage.warning('请选择辅导科目')
  if (!form.guardian.trim()) return ElMessage.warning('请填写家长/监护人')

  const old = me.value
  const next: Partial<StudentAccount> = {
    name: form.name.trim(),
    gender: form.gender,
    phone: form.phone.trim(),
    grade: form.grade,
    subjects: encodeSubjects([form.subject]),
    guardian: form.guardian.trim(),
    note: form.note.trim(),
    availability: [...form.availability],
  }
  const fields: ProfileReviewField[] = []
  const push = (label: string, o: string, n: string) => {
    if (o !== n) fields.push({ label, old: o || '未填写', next: n || '未填写' })
  }
  push('姓名', old.name, next.name ?? '')
  push('性别', old.gender, next.gender ?? '')
  push('联系电话', old.phone, next.phone ?? '')
  push('年级', old.grade, next.grade ?? '')
  push('辅导科目', decodeSubjects(old.subjects).join('、'), decodeSubjects(next.subjects ?? 0).join('、'))
  push('家长/监护人', old.guardian, next.guardian ?? '')
  push('备注', old.note ?? '', next.note ?? '')
  push('空余时间', fmtSched(old.availability), fmtSched(next.availability))
  if (!fields.length) {
    ElMessage.info('资料没有任何改动')
    return
  }
  submitting.value = true
  try {
    store.submitProfileReview(me.value.username, 'student', next.name!, next, fields)
    ElMessage.success('修改申请已提交，等待管理员审核')
    editVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function cancelPending() {
  const review = pending.value
  if (!review) return
  try {
    await ElMessageBox.confirm('确定撤销这份资料修改申请吗？撤销后需重新填写提交。', '撤销申请', {
      type: 'warning',
      confirmButtonText: '撤销申请',
      cancelButtonText: '再想想',
    })
    store.cancelProfileReview(review.id)
    ElMessage.success('已撤销申请')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error((e as Error).message)
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

    <!-- 我的资料（对外展示；修改需管理员审核） -->
    <section class="section">
      <div class="section-head">
        <h3 class="section-title">我的资料</h3>
        <p class="section-desc">
          以下资料对老师与管理员可见。修改需提交管理员审核，<b>审核通过前仍展示当前资料</b>。
        </p>
      </div>

      <el-alert
        v-if="pending"
        class="pending-tip"
        :title="`资料修改申请审核中（提交于 ${new Date(pending.submittedAt).toLocaleString('zh-CN')}），通过后新资料才会生效。`"
        type="warning"
        :closable="false"
        show-icon
      >
        <el-button link type="danger" @click="cancelPending">撤销申请</el-button>
      </el-alert>

      <el-descriptions :column="2" border class="profile-desc">
        <el-descriptions-item label="姓名">{{ me?.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ me?.gender }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ me?.username }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ me?.phone }}</el-descriptions-item>
        <el-descriptions-item label="年级">{{ me?.grade }}</el-descriptions-item>
        <el-descriptions-item label="辅导科目">
          {{ mySubjects.join('、') || '未选' }}
        </el-descriptions-item>
        <el-descriptions-item label="家长/监护人">{{ me?.guardian }}</el-descriptions-item>
        <el-descriptions-item label="入驻时间">
          {{ me ? new Date(me.createdAt).toLocaleDateString('zh-CN') : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ me?.note || '—' }}</el-descriptions-item>
        <el-descriptions-item label="我的空余时间">{{ myScheduleText }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-actions">
        <el-button type="primary" round :disabled="!!pending" @click="openEdit">
          {{ pending ? '等待管理员审核' : '修改资料（需管理员审核）' }}
        </el-button>
      </div>
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
      <el-form-item label="联系电话">
        <el-input v-model="form.phone" placeholder="手机号 / 座机" maxlength="20" />
      </el-form-item>
      <el-form-item label="年级">
        <el-select v-model="form.grade" placeholder="选择年级" style="width: 240px">
          <el-option v-for="g in GRADE_OPTIONS" :key="g" :label="g" :value="g" />
        </el-select>
      </el-form-item>
      <el-form-item label="辅导科目">
        <el-select v-model="form.subject" placeholder="选择科目" style="width: 240px">
          <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="家长/监护人">
        <el-input v-model="form.guardian" placeholder="如：王先生（家长）" maxlength="30" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="其他需要说明的情况（选填）" maxlength="100" show-word-limit />
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
  margin-bottom: 16px;
}

.section-title {
  font-size: 17px;
  color: var(--text-main);
}

.section-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.6;
}

.pending-tip {
  margin-bottom: 16px;
}

.profile-desc {
  font-size: 13px;
}

.section-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.edit-form {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}

.edit-tip {
  font-size: 12.5px;
  color: var(--text-tertiary);
  background: var(--bg-subtle);
  border-radius: 8px;
  padding: 8px 12px;
  line-height: 1.6;
}

.section-actions :deep(.el-button + .el-button) {
  margin-left: 10px;
}
</style>
