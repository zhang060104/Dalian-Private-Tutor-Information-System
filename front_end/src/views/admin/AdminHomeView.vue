<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'
import { useSystemStore } from '@/stores/system'
import { decodeGrades, decodeSubjects, scheduleSummary } from '@/utils/availability'

/**
 * 独立管理后台（/admin）
 *
 * 约定：门户页面不设置任何跳转入口，本页也不放置任何站内导航/跳转按钮，
 * 仅保留右上角「退出登录」这一功能性操作。管理员直接访问 /admin 进入。
 */

const store = useSystemStore()
const router = useRouter()

const teachers = computed(() => store.teachers)
const students = computed(() => store.students)
const adminName = computed(() => (store.current?.role === 'admin' ? store.current.name : '管理员'))

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
  for (const r of store.relations) {
    const teacher = store.users.find((u) => u.username === r.teacherUsername)
    const student = store.users.find((u) => u.username === r.studentUsername)
    if (!teacher || !student) continue
    const key = `${r.teacherUsername}|${r.studentUsername}`
    const existed = map.get(key)
    const base = existed ?? {
      teacherName: teacher.name,
      studentName: student.name,
      teacherWant: false,
      studentWant: false,
      status: 'teacher-only' as PairView['status'],
      updatedAt: r.createdAt,
    }
    if (r.by === 'teacher') base.teacherWant = true
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
  router.replace('/login')
}
</script>

<template>
  <div class="admin">
    <!-- 顶部：仅标题 + 退出，无任何站内导航 -->
    <header class="admin-header">
      <div class="admin-header-inner">
        <div class="admin-brand">
          <span class="admin-logo">教</span>
          <div>
            <div class="admin-title">大连私人家教中心 · 管理后台</div>
            <div class="admin-sub">独立管理页面（门户不设入口）</div>
          </div>
        </div>
        <div class="admin-user">
          <span class="admin-user-name">{{ adminName }}</span>
          <button class="admin-logout" type="button" title="退出登录" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </button>
        </div>
      </div>
    </header>

    <main class="admin-body">
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
      </div>

      <el-alert
        class="admin-tip"
        title="前端演示模式：数据保存在浏览器 localStorage；接入后端后替换为真实接口。"
        type="info"
        :closable="false"
        show-icon
      />

      <!-- 数据面板 -->
      <div class="admin-panel">
        <el-tabs>
          <el-tab-pane label="入驻老师">
            <el-table :data="teachers" stripe>
              <el-table-column prop="username" label="账号" width="120" />
              <el-table-column label="姓名" width="120">
                <template #default="{ row }">{{ row.name }}（{{ row.gender }}）</template>
              </el-table-column>
              <el-table-column label="主教科目" min-width="140">
                <template #default="{ row }">
                  <el-tag v-for="s in decodeSubjects(row.subjects)" :key="s" size="small" effect="plain">{{ s }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="可教年级" min-width="150">
                <template #default="{ row }">
                  <el-tag v-for="g in decodeGrades(row.grades)" :key="g" size="small" type="success" effect="plain">{{ g }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="years" label="教龄" width="80" />
              <el-table-column prop="education" label="学历" min-width="140" />
              <el-table-column prop="pricePerHour" label="课时费" width="110">
                <template #default="{ row }">¥{{ row.pricePerHour }}/小时</template>
              </el-table-column>
              <el-table-column label="一周空余时间" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ schedCompact(row.availability) }}</template>
              </el-table-column>
              <el-table-column prop="phone" label="电话" width="130" />
              <el-table-column prop="createdAt" label="入驻时间" width="170">
                <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="入驻学生">
            <el-table :data="students" stripe>
              <el-table-column prop="username" label="账号" width="120" />
              <el-table-column label="姓名" width="120">
                <template #default="{ row }">{{ row.name }}（{{ row.gender }}）</template>
              </el-table-column>
              <el-table-column prop="grade" label="年级" width="130" />
              <el-table-column label="辅导科目" min-width="120">
                <template #default="{ row }">{{ decodeSubjects(row.subjects).join('、') || '未选' }}</template>
              </el-table-column>
              <el-table-column label="一周空余时间" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ schedCompact(row.availability) }}</template>
              </el-table-column>
              <el-table-column prop="guardian" label="家长" width="140" />
              <el-table-column prop="phone" label="电话" width="130" />
              <el-table-column prop="note" label="备注" min-width="160" />
              <el-table-column prop="createdAt" label="入驻时间" width="170">
                <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
              </el-table-column>
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
  </div>
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
  border-radius: 11px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
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
</style>
