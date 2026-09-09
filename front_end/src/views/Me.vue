<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import type { Order, Profile, Role, WeekTimeTables } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { getMyProfile, setSeeking, requestProfileChange } from '@/api/users'
import { listMyOrders } from '@/api/orders'
import { gradeLabel, GRADE_LEVELS, TEACHER_GRADE_LEVELS } from '@/utils/grade'
import { decodeSubjects, SUBJECTS } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'
import { orderStatus } from '@/utils/order'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'

const auth = useAuthStore()
const router = useRouter()
const meRole = (auth.role ?? 'teacher') as 'student' | 'teacher'
const meId = auth.userId!

const me = ref<Profile | null>(null)
const orders = ref<Order[]>([])
const loading = ref(true)

// 修改弹窗
const editOpen = ref(false)
const editFormRef = ref<FormInstance>()
const edit = reactive({
  age: undefined as number | undefined, gender: undefined as '男' | '女' | undefined,
  grade: undefined as number | undefined, subjects: [] as number[], description: '',
  address: '', timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables,
})
const captchaOk = ref(false)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    me.value = await getMyProfile(meRole, meId)
    orders.value = await listMyOrders(meRole, meId)
  } finally {
    loading.value = false
  }
}

function subjectsText(p: Profile): string {
  const s = decodeSubjects(p.subject)
  return s.length ? s.join('、') : '—'
}
function timeText(p: Profile): string {
  const s = timetableSummary(p.timeTables)
  if (!s.length) return '时间待定'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('\n')
}
function statusMeta(p: Profile) {
  return p.status === 1 ? { text: '已停止寻找', type: 'info' as const } : { text: '正在寻找', type: 'success' as const }
}

function openEdit() {
  if (!me.value) return
  edit.age = me.value.age ?? undefined
  edit.gender = me.value.gender ?? undefined
  edit.grade = me.value.grade
  edit.subjects = decodeSubjects(me.value.subject).map((s) => SUBJECTS.indexOf(s)).filter((i) => i >= 0)
  edit.description = me.value.description
  edit.address = me.value.address ?? ''
  edit.timeTables = [...me.value.timeTables] as WeekTimeTables
  captchaOk.value = false
  editOpen.value = true
}

async function submitEdit() {
  if (!captchaOk.value) return ElMessage.warning('请先完成滑块验证')
  if (!edit.subjects.length) return ElMessage.warning('请至少选择一项')
  let subject = 0
  edit.subjects.forEach((i) => (subject |= 1 << i))
  saving.value = true
  try {
    await requestProfileChange(meRole, meId, {
      age: edit.age ?? null, gender: edit.gender, grade: edit.grade,
      subject, description: edit.description, address: edit.address || null,
      timeTables: edit.timeTables,
    })
    ElMessage.success('修改已提交，待管理员审核通过后生效')
    editOpen.value = false
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus() {
  const s = await setSeeking(meRole, meId)
  ElMessage.success(s === 1 ? '已停止寻找，不再出现在匹配列表' : '已恢复寻找')
  load()
}
function goOrder(o: Order) {
  router.push(`/order/${o.id}`)
}

onMounted(load)
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="page-header">
      <h1 class="page-title">我的主页</h1>
      <div class="flex gap-8">
        <el-button size="small" @click="toggleStatus">
          {{ me?.status === 1 ? '恢复寻找' : '暂停寻找' }}
        </el-button>
        <el-button size="small" type="primary" plain @click="openEdit">修改资料</el-button>
      </div>
    </div>

    <template v-if="me">
      <!-- 资料 -->
      <el-card shadow="never" class="mb-16">
        <div class="head">
          <div class="avatar">{{ me.nickname.charAt(0) }}</div>
          <div class="info">
            <div class="name-row">
              <b>{{ me.nickname }}</b>
              <el-tag :type="meRole === 'teacher' ? 'primary' : 'success'" effect="light">{{ meRole === 'teacher' ? '老师' : '学生' }}</el-tag>
              <el-tag :type="statusMeta(me).type" effect="plain">{{ statusMeta(me).text }}</el-tag>
              <span class="credit-pill">信用 {{ me.credit }}</span>
            </div>
          </div>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="年级">{{ gradeLabel(me.grade) }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ me.gender ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ me.age ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="科目">{{ subjectsText(me) }}</el-descriptions-item>
          <el-descriptions-item label="个人简介" :span="2"><pre class="d-pre">{{ me.description || '暂无' }}</pre></el-descriptions-item>
          <el-descriptions-item label="所在区域">{{ me.address || '—' }}</el-descriptions-item>
          <el-descriptions-item label="空闲时间"><pre class="d-pre">{{ timeText(me) }}</pre></el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 进行中的订单 -->
      <el-card shadow="never">
        <template #header>进行中的订单（商议中 + 授课中）</template>
        <el-empty v-if="!orders.length" description="暂无进行中的订单" />
        <div v-for="o in orders" :key="o.id" class="order" @click="goOrder(o)">
          <div class="order-main">
            <div class="flex gap-8">
              <b>{{ o.peer?.nickname }}</b>
              <el-tag size="small" effect="plain">{{ decodeSubjects(o.subject).join('、') || '—' }}</el-tag>
            </div>
            <div class="muted">{{ o.description }}</div>
          </div>
          <el-tag :type="o.status === 9 ? 'success' : 'primary'" effect="dark">{{ orderStatus(o.status).name }}</el-tag>
        </div>
      </el-card>
    </template>

    <!-- 修改资料弹窗（提交管理员审核） -->
    <el-dialog v-model="editOpen" title="修改我的资料" width="680px">
      <el-alert type="warning" :closable="false" show-icon class="mb-16">修改需提交管理员审核，审核通过后新资料生效</el-alert>
      <el-form ref="editFormRef" :model="edit" label-position="top">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="年龄"><el-input-number v-model="edit.age" :min="6" :max="90" :controls="false" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="性别">
              <el-radio-group v-model="edit.gender"><el-radio-button value="男">男</el-radio-button><el-radio-button value="女">女</el-radio-button></el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="meRole === 'teacher' ? '可授年级' : '年级'">
              <el-select v-model="edit.grade" style="width: 100%">
                <el-option v-for="g in (meRole === 'teacher' ? TEACHER_GRADE_LEVELS : GRADE_LEVELS)" :key="g.value" :label="g.label" :value="g.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="meRole === 'teacher' ? '可授科目' : '需要的科目'">
          <el-checkbox-group v-model="edit.subjects">
            <el-checkbox v-for="(s, i) in SUBJECTS" :key="s" :value="i">{{ s }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="个人简介"><el-input v-model="edit.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="所在区域"><el-input v-model="edit.address" /></el-form-item>
        <el-form-item label="空闲时间"><ScheduleEditor v-model="edit.timeTables" /></el-form-item>
        <el-form-item label="安全验证"><SliderCaptcha @success="captchaOk = true" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" :disabled="!captchaOk" :loading="saving" @click="submitEdit">提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  gap: 16px;
  margin-bottom: 18px;
}
.avatar {
  width: 62px;
  height: 62px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #5aa2ff, #2f7cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.name-row b {
  font-size: 20px;
  color: #1d2740;
}
.d-pre {
  font-family: inherit;
  white-space: pre-line;
  margin: 0;
}
.order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid #eef1f6;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
}
.order:hover {
  border-color: #cfe0fb;
}
.order-main b {
  font-size: 15px;
}
</style>
