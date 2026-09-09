<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserAdmin, listOrdersForUserAdmin, type AdminOrderRow, type AdminUserView } from '@/api/admin'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'

const route = useRoute()
const router = useRouter()
const role = (route.params.role as string) as 'student' | 'teacher'
const id = Number(route.params.id)

const profile = ref<AdminUserView | null>(null)
const orders = ref<AdminOrderRow[]>([])
const loading = ref(true)
const activeTab = ref(route.query.tab === 'orders' ? 'orders' : 'profile')

function subjectsText(): string {
  return profile.value ? decodeSubjects(profile.value.subject).join('、') || '—' : '—'
}
function timeText(): string {
  const s = timetableSummary(profile.value?.timeTables ?? [0, 0, 0, 0, 0, 0, 0])
  if (!s.length) return '时间待定'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('；')
}
function statusTag(t: 'student' | 'teacher'): 'primary' | 'success' {
  return t === 'teacher' ? 'primary' : 'success'
}
function openOrder(r: AdminOrderRow) {
  router.push(`/admin/order/${r.id}`)
}
function orderTag(row: AdminOrderRow): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (row.status === 12) return 'info'
  if (row.status === 5) return 'warning'
  if (row.status >= 9 && row.status <= 11) return 'success'
  return 'primary'
}
const otherRole = computed(() => (role === 'student' ? 'teacher' : 'student'))
const otherLabel = computed(() => (role === 'student' ? '教师' : '学生'))

onMounted(async () => {
  loading.value = true
  try {
    profile.value = await getUserAdmin(role, id)
    if (!profile.value) {
      ElMessage.error('用户不存在')
      router.replace('/admin/credit')
      return
    }
    orders.value = await listOrdersForUserAdmin(role, id)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <el-page-header class="ph" @back="router.back()">
      <template #content>
        用户档案 · {{ role === 'teacher' ? '老师' : '学生' }} {{ profile?.nickname ?? '#' + id }}
      </template>
    </el-page-header>

    <el-card v-if="profile" shadow="never" class="mb-16">
      <div class="head">
        <div class="avatar">{{ profile.nickname.charAt(0) }}</div>
        <div class="info">
          <div class="line1">
            <b>{{ profile.nickname }}</b>
            <el-tag :type="statusTag(role)" effect="light">{{ role === 'teacher' ? '老师' : '学生' }}</el-tag>
            <el-tag type="info" effect="plain">{{ gradeLabel(profile.grade) }}</el-tag>
            <span class="credit-pill">信用 {{ profile.credit }}</span>
          </div>
          <div class="muted">{{ profile.description || '暂无简介' }}</div>
          <div class="muted">账号：{{ profile.phone }}</div>
        </div>
      </div>
    </el-card>

    <el-card v-if="profile" shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="个人资料" name="profile">
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="role === 'teacher' ? '本人年级' : '年级'">
              {{ gradeLabel(profile.grade) }}
            </el-descriptions-item>
            <el-descriptions-item label="性别">{{ profile.gender ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ profile.age ?? '—' }}</el-descriptions-item>
            <el-descriptions-item :label="role === 'teacher' ? '可授科目' : '需要的科目'">
              {{ subjectsText() }}
            </el-descriptions-item>
            <el-descriptions-item label="所在区域" :span="2">{{ profile.address || '—' }}</el-descriptions-item>
            <el-descriptions-item label="空闲时间" :span="2">{{ timeText() }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane :label="`历史订单（${orders.length}）`" name="orders">
          <el-table v-if="orders.length" :data="orders" stripe @row-click="openOrder" style="cursor: pointer">
            <el-table-column label="订单号" width="90">
              <template #default="{ row }">#{{ row.id }}</template>
            </el-table-column>
            <el-table-column :label="otherLabel" min-width="110">
              <template #default="{ row }">
                {{ otherRole === 'student' ? row.studentName : row.teacherName }}
              </template>
            </el-table-column>
            <el-table-column prop="subjectsText" label="科目" min-width="130" />
            <el-table-column label="时薪" width="90">
              <template #default="{ row }">¥{{ row.hourlyWage }}</template>
            </el-table-column>
            <el-table-column label="状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="orderTag(row)" effect="light">{{ row.statusName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="stageName" label="阶段" width="100" />
          </el-table>
          <el-empty v-else description="该用户暂无任何订单" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.ph {
  margin-bottom: 18px;
}
.head {
  display: flex;
  gap: 16px;
  align-items: center;
}
.avatar {
  width: 58px;
  height: 58px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #5aa2ff, #2f7cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}
.info {
  min-width: 0;
}
.line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.line1 b {
  font-size: 17px;
}
.muted {
  font-size: 13px;
  color: #606266;
}
</style>