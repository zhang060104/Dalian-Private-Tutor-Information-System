<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'
import { useSystemStore } from '@/stores/system'
import { decodeSubjects, scheduleSummary } from '@/utils/availability'
import { gradeLabel } from '@/data/tutors'
import * as api from '@/api'
import type { TeacherDto, StudentDto, OrderDto } from '@/api'
import type { ProfileReview } from '@/types'

/**
 * 独立管理后台（/admin）
 *
 * 约定：门户页面不设置任何跳转入口，本页也不放置任何站内导航/跳转按钮，
 * 仅保留右上角「退出登录」这一功能性操作。管理员直接访问 /admin 进入。
 * 数据来源：/api/admin/* 后端接口。
 */

const store = useSystemStore()
const router = useRouter()

const teachers = ref<Array<Record<string, unknown>>>([])
const students = ref<Array<Record<string, unknown>>>([])
const adminOrders = ref<OrderDto[]>([])
const adminName = computed(() => (store.current?.role === 'admin' ? store.current.name : '管理员'))

function teacherView(dto: TeacherDto) {
  return {
    name: dto.nickname,
    gender: dto.gender,
    phone: dto.phone,
    subjects: dto.subject ?? 0,
    grade: dto.grade ?? 0,
    availability: [dto.timeTable1, dto.timeTable2, dto.timeTable3, dto.timeTable4, dto.timeTable5, dto.timeTable6, dto.timeTable7].map((v) => v ?? 0),
  }
}

function studentView(dto: StudentDto) {
  return {
    name: dto.nickname,
    gender: dto.gender,
    phone: dto.phone,
    subjects: dto.subject ?? 0,
    grade: dto.grade ?? 0,
    note: dto.description || undefined,
    availability: [dto.timeTable1, dto.timeTable2, dto.timeTable3, dto.timeTable4, dto.timeTable5, dto.timeTable6, dto.timeTable7].map((v) => v ?? 0),
  }
}

async function loadAdminData() {
  const [t, s, o] = await Promise.all([api.adminTeachers(), api.adminStudents(), api.adminOrders()])
  teachers.value = t.map(teacherView)
  students.value = s.map(studentView)
  adminOrders.value = o
  await store.loadReviews()
}

onMounted(() => {
  loadAdminData().catch(() => {})
})

/* ---------------- 个人资料修改审核 ---------------- */

const reviews = computed(() => store.reviews)
const reviewTabLabel = computed(() => (reviews.value.length ? `资料审核（${reviews.value.length}）` : '资料审核'))

const detailVisible = ref(false)
const detail = ref<ProfileReview | null>(null)
const reviewBusy = ref(false)

function openDetail(r: ProfileReview) {
  detail.value = r
  detailVisible.value = true
}

function fmtTime(iso: string): string {
  return iso ? new Date(iso).toLocaleString('zh-CN') : ''
}

function fieldLabels(r: ProfileReview): string {
  return r.fields.map((f) => f.label).join('、')
}

async function resolveReview(r: ProfileReview, approve: boolean) {
  try {
    await ElMessageBox.confirm(
      approve
        ? `确认通过「${r.name}（${r.phone}）」的资料修改？新资料将立即生效并对外展示。`
        : `确认驳回「${r.name}（${r.phone}）」的资料修改？将保留其当前资料，申请人需重新提交。`,
      approve ? '通过审核' : '驳回申请',
      {
        type: 'warning',
        confirmButtonText: approve ? '通过并生效' : '确认驳回',
        cancelButtonText: '再想想',
      },
    )
  } catch {
    return
  }
  reviewBusy.value = true
  try {
    await store.resolveReview(r.id, approve)
    ElMessage.success(approve ? '已通过，新资料已生效' : '已驳回，原资料保持不变')
    detailVisible.value = false
    if (approve) await loadAdminData()
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    reviewBusy.value = false
  }
}

interface PairView {
  teacherName: string
  studentName: string
  teacherWant: boolean
  studentWant: boolean
  status: 'matched' | 'teacher-only' | 'student-only'
  updatedAt: string
}

/** 汇总师生匹配关系（按 老师×学生 归并双向选择） */
const pairs = computed<PairView[]>(() => {
  const map = new Map<string, PairView>()
  for (const o of adminOrders.value) {
    const key = `${o.teacherId}|${o.studentId}`
    const existed = map.get(key)
    const base = existed ?? {
      teacherName: o.teacherName ?? `老师${o.teacherId}`,
      studentName: o.studentName ?? `学生${o.studentId}`,
      teacherWant: false,
      studentWant: false,
      status: 'teacher-only' as PairView['status'],
      updatedAt: o.createdAt ?? '',
    }
    if (o.status === 0) base.teacherWant = true
    else base.studentWant = true
    base.status = base.teacherWant && base.studentWant ? 'matched' : base.teacherWant ? 'teacher-only' : 'student-only'
    if (!existed) map.set(key, base)
  }
  return [...map.values()]
})

const matchedPairs = computed(() => pairs.value.filter((p) => p.status === 'matched').length)
const pendingPairs = computed(() => pairs.value.filter((p) => p.status !== 'matched').length)

function statusTag(p: PairView) {
  if (p.status === 'matched') return { type: 'success' as const, text: '✓ 已匹配' }
  if (p.status === 'teacher-only') return { type: 'warning' as const, text: '老师发起' }
  return { type: 'primary' as const, text: '学生发起' }
}

/** 空余时间紧凑摘要：'周一 08:00-11:00；周二 14:00-16:00 …' */
function schedCompact(availability?: number[]): string {
  const busy = scheduleSummary(availability).filter((x) => !x.includes('无空闲'))
  return busy.length ? busy.join('；') : '未填写'
}

function logout() {
  store.logout()
  ElMessage.success('已退出登录')
  router.replace('/admin')
}

/** 是否已登录管理员：未登录时本页显示管理员登录卡，由路由守卫放行到此 */
const isAdmin = computed(() => store.current?.role === 'admin')

/** 管理员登录（独立于公共登录页，仅地址栏直达 /admin 可进入） */
const loginForm = reactive({ phone: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')

async function adminLogin() {
  loginError.value = ''
  if (!loginForm.phone.trim() || !loginForm.password) {
    loginError.value = '请输入管理员手机号与密码'
    return
  }
  loginLoading.value = true
  try {
    await store.login(loginForm.phone, loginForm.password, 'admin')
    ElMessage.success('管理员登录成功')
    loadAdminData().catch(() => {})
  } catch (e) {
    loginError.value = (e as Error).message
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <div class="admin">
    <!-- 顶部：仅标题 + 退出，无任何站内导航 -->
    <header class="admin-header">
      <div class="admin-header-inner">
        <div class="admin-brand">
          <img src="/logo.png" alt="大连私人家教中心" class="admin-logo" />
          <div>
            <div class="admin-title">大连私人家教中心 · 管理后台</div>
            <div class="admin-sub">独立管理页面（门户不设入口）</div>
          </div>
        </div>
        <div v-if="isAdmin" class="admin-user">
          <span class="admin-user-name">{{ adminName }}</span>
          <button class="admin-logout" type="button" title="退出登录" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </button>
        </div>
      </div>
    </header>

    <!-- 已登录管理员：后台工作区 -->
    <main v-if="isAdmin" class="admin-body">
      <!-- 统计 -->
      <div class="admin-stats">
        <div class="admin-stat">
          <b>{{ teachers.length }}</b><span>入驻老师</span>
        </div>
        <div class="admin-stat">
          <b>{{ students.length }}</b><span>入驻学生</span>
        </div>
        <div class="admin-stat">
          <b>{{ pairs.length }}</b><span>选择关系</span>
        </div>
        <div class="admin-stat admin-stat--ok">
          <b>{{ matchedPairs }}</b><span>已匹配</span>
        </div>
        <div class="admin-stat admin-stat--warn">
          <b>{{ pendingPairs }}</b><span>待双向确认</span>
        </div>
        <div class="admin-stat admin-stat--warn">
          <b>{{ reviews.length }}</b><span>待审资料修改</span>
        </div>
      </div>

      <el-alert
        class="admin-tip"
        title="数据已接入后端接口（/api/admin/*），展示为数据库真实数据。"
        type="info"
        :closable="false"
        show-icon
      />

      <!-- 数据面板 -->
      <div class="admin-panel">
        <el-tabs>
          <el-tab-pane :label="reviewTabLabel">
            <el-table :data="reviews" stripe>
              <el-table-column label="提交人" min-width="150">
                <template #default="{ row }">
                  {{ row.name }}
                  <el-tag :type="row.role === 'teacher' ? 'warning' : 'primary'" size="small" effect="plain">
                    {{ row.role === 'teacher' ? '老师' : '学生' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column label="修改内容" min-width="220">
                <template #default="{ row }">{{ fieldLabels(row) }}</template>
              </el-table-column>
              <el-table-column label="提交时间" width="170">
                <template #default="{ row }">{{ fmtTime(row.submittedAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="110" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="暂无待审核的资料修改申请" :image-size="80" />
              </template>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="入驻老师">
            <el-table :data="teachers" stripe>
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column label="姓名" width="120">
                <template #default="{ row }">{{ row.name }}（{{ row.gender }}）</template>
              </el-table-column>
              <el-table-column label="主教科目" min-width="140">
                <template #default="{ row }">
                  <el-tag v-for="s in decodeSubjects(row.subjects)" :key="s" size="small" effect="plain">{{ s }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="可授年级" min-width="120">
                <template #default="{ row }">
                  <el-tag size="small" type="success" effect="plain">{{ gradeLabel(row.grade) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="一周空余时间" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ schedCompact(row.availability) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="入驻学生">
            <el-table :data="students" stripe>
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column label="姓名" width="120">
                <template #default="{ row }">{{ row.name }}（{{ row.gender }}）</template>
              </el-table-column>
              <el-table-column label="年级" width="130">
                <template #default="{ row }">{{ gradeLabel(row.grade) }}</template>
              </el-table-column>
              <el-table-column label="辅导科目" min-width="120">
                <template #default="{ row }">{{ decodeSubjects(row.subjects).join('、') || '未选' }}</template>
              </el-table-column>
              <el-table-column label="一周空余时间" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ schedCompact(row.availability) }}</template>
              </el-table-column>
              <el-table-column prop="note" label="备注" min-width="160" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="师生匹配关系">
            <el-table :data="pairs" stripe>
              <el-table-column prop="teacherName" label="老师" width="140" />
              <el-table-column prop="studentName" label="学生" width="140" />
              <el-table-column label="老师选择学生" width="130">
                <template #default="{ row }">{{ row.teacherWant ? '✓' : '—' }}</template>
              </el-table-column>
              <el-table-column label="学生选择老师" width="130">
                <template #default="{ row }">{{ row.studentWant ? '✓' : '—' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="130">
                <template #default="{ row }">
                  <el-tag :type="statusTag(row).type" size="small">{{ statusTag(row).text }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="updatedAt" label="最近操作" min-width="180">
                <template #default="{ row }">{{ new Date(row.updatedAt).toLocaleString('zh-CN') }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!pairs.length" description="暂无选择关系" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>

    <!-- 未登录：管理员专用登录卡（门户无任何入口，仅地址栏手动输入 /admin 直达） -->
    <main v-else class="admin-login-body">
      <div class="admin-login-card">
        <img src="/logo.png" alt="大连私人家教中心" class="admin-login-logo" />
        <h2 class="admin-login-title">管理后台登录</h2>
        <p class="admin-login-sub">大连私人家教中心 · 内部管理入口</p>

        <el-form label-position="top" size="large" @submit.prevent="adminLogin">
          <el-form-item label="管理员手机号">
            <el-input
              v-model="loginForm.phone"
              placeholder="请输入管理员手机号"
              clearable
              autocomplete="tel"
              @keyup.enter="adminLogin"
            />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="current-password"
              @keyup.enter="adminLogin"
            />
          </el-form-item>
          <p v-if="loginError" class="admin-login-error">{{ loginError }}</p>
          <el-button class="admin-login-submit" type="primary" size="large" :loading="loginLoading" @click="adminLogin">
            登 录
          </el-button>
        </el-form>
      </div>
    </main>
  </div>

  <!-- 资料修改审核详情：旧值 → 新值 对比 -->
  <el-dialog
    v-model="detailVisible"
    :title="detail ? `资料修改审核 · ${detail.name}（${detail.phone}）` : ''"
    width="560px"
    top="8vh"
    :close-on-click-modal="false"
  >
    <p v-if="detail" class="review-meta">
      提交时间：{{ fmtTime(detail.submittedAt) }} · 审核通过前仍对外展示当前资料
    </p>
    <div v-if="detail" class="diff-list">
      <div v-for="f in detail.fields" :key="f.label" class="diff-row">
        <span class="diff-label">{{ f.label }}</span>
        <span class="diff-old" :title="f.old">{{ f.old }}</span>
        <span class="diff-arrow">→</span>
        <span class="diff-new" :title="f.next">{{ f.next }}</span>
      </div>
    </div>
    <template #footer>
      <el-button type="danger" plain :loading="reviewBusy" @click="detail && resolveReview(detail, false)">
        驳 回
      </el-button>
      <el-button type="primary" :loading="reviewBusy" @click="detail && resolveReview(detail, true)">
        通过并生效
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: #f2f4f9;
  display: flex;
  flex-direction: column;
}

/* 顶部栏：深色、独立、无导航 */
.admin-header {
  background: #10182e;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(16, 24, 46, 0.25);
}

.admin-header-inner {
  max-width: var(--container-width);
  margin: 0 auto;
  width: calc(100% - 32px);
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.admin-title {
  font-size: 16px;
  font-weight: 600;
}

.admin-sub {
  font-size: 11.5px;
  opacity: 0.65;
  margin-top: 2px;
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 14px;
}

.admin-user-name {
  font-size: 13px;
  opacity: 0.9;
}

.admin-logout {
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: #fff;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}

.admin-logout:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: #fff;
}

/* 主体 */
.admin-body {
  max-width: var(--container-width);
  margin: 0 auto;
  width: calc(100% - 32px);
  padding: 24px 0 60px;
  flex: 1;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.admin-stat {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 18px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.admin-stat b {
  display: block;
  font-size: 26px;
  color: var(--text-main);
}

.admin-stat span {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.admin-stat--ok b {
  color: var(--success-color);
}

.admin-stat--warn b {
  color: var(--warning-color);
}

.admin-tip {
  margin-bottom: 16px;
}

.admin-panel {
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: 8px 16px 18px;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-tag + .el-tag) {
  margin-left: 4px;
}

/* ---------- 管理员登录卡（未登录时整页展示） ---------- */
.admin-login-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px 64px;
}

.admin-login-card {
  width: 400px;
  max-width: 100%;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  padding: 36px 32px 28px;
}

.admin-login-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  display: block;
  object-fit: contain;
}

.admin-login-title {
  text-align: center;
  font-size: 19px;
  color: var(--text-main);
}

.admin-login-sub {
  margin-top: 6px;
  margin-bottom: 22px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.admin-login-error {
  margin: -4px 0 12px;
  font-size: 12.5px;
  color: var(--danger-color);
}

.admin-login-submit {
  width: 100%;
  letter-spacing: 6px;
  margin-top: 2px;
}

/* ---------- 资料审核详情 ---------- */

.review-meta {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diff-row {
  display: grid;
  grid-template-columns: 88px 1fr 20px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.diff-label {
  color: var(--text-secondary);
}

.diff-old {
  color: var(--text-secondary);
  text-decoration: line-through;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-arrow {
  color: var(--text-tertiary, var(--text-secondary));
  text-align: center;
}

.diff-new {
  color: var(--success-color, #1d9e75);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
