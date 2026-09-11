<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Role } from '@/types'
import {
  adjustCreditAdmin,
  deactivateAccount,
  listAllUsers,
  purgeAccount,
  restoreAccount,
  type AdminUserView,
} from '@/api/admin'
import { gradeLabel } from '@/utils/grade'

const router = useRouter()
const users = ref<AdminUserView[]>([])
const deltas = ref<Record<string, number>>({})
const loading = ref(true)

async function refresh() {
  loading.value = true
  try {
    users.value = await listAllUsers()
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

function goArchive(u: AdminUserView, tab: 'profile' | 'orders') {
  router.push(`/admin/user/${u.role}/${u.id}${tab === 'orders' ? '?tab=orders' : ''}`)
}

async function apply(u: AdminUserView) {
  const delta = deltas.value[`${u.role}-${u.id}`] ?? 0
  if (!delta) return ElMessage.warning('请输入调整值（正数加、负数减）')
  await adjustCreditAdmin(u.role, u.id, u.credit + delta)
  ElMessage.success('已调整')
  refresh()
}
async function quick(u: AdminUserView, d: number) {
  await adjustCreditAdmin(u.role, u.id, u.credit + d)
  ElMessage.success(`已${d > 0 ? '加' : '减'}${Math.abs(d)} 信用分`)
  refresh()
}

const key = (u: { role: Role; id: number }) => `${u.role}-${u.id}`

/** 状态展示：-2=已注销 / -1=待审核 / 0=寻找中 / 1=已暂停 */
function statusOf(u: AdminUserView): { text: string; type: 'success' | 'info' | 'warning' | 'danger' } {
  if (u.status === -2) return { text: '已注销', type: 'danger' }
  if (u.status === -1) return { text: '待审核', type: 'warning' }
  return u.seeking ? { text: '寻找中', type: 'success' } : { text: '已停止', type: 'info' }
}

const roleName = (u: AdminUserView) => (u.role === 'teacher' ? '老师' : '学生')

/** 注销账号（软删除）：保留订单历史，仅停止使用与展示 */
async function deactivate(u: AdminUserView) {
  await ElMessageBox.confirm(
    `确认注销${roleName(u)}【${u.nickname}】（ID ${u.id}）？\n注销后该账号无法登录、不出现在任何教师/学生列表中，历史订单保留。`,
    '注销账号',
    { type: 'warning', confirmButtonText: '确认注销', cancelButtonText: '取消' },
  )
  await deactivateAccount(u.role, u.id)
  ElMessage.success('已注销该账号')
  refresh()
}

/** 恢复已注销账号 */
async function restore(u: AdminUserView) {
  await ElMessageBox.confirm(`确认恢复${roleName(u)}【${u.nickname}】？恢复后账号可登录，并重新进入寻找列表。`, '恢复账号', {
    type: 'info',
    confirmButtonText: '确认恢复',
    cancelButtonText: '取消',
  })
  await restoreAccount(u.role, u.id)
  ElMessage.success('已恢复该账号')
  refresh()
}

/** 彻底删除（物理删除，仅超管）：用于清理脏数据，会连同其订单一起删除 */
async function purge(u: AdminUserView) {
  const { value } = await ElMessageBox.prompt(
    `此操作【不可恢复】：将永久删除${roleName(u)}【${u.nickname}】（ID ${u.id}），并连带删除其名下全部订单。\n请输入该账号昵称以确认：`,
    '彻底删除账号',
    {
      type: 'error',
      confirmButtonText: '彻底删除',
      cancelButtonText: '取消',
      inputPlaceholder: u.nickname,
      inputValidator: (v: string) => (v === u.nickname ? true : '昵称不一致，已取消删除'),
    },
  )
  if (value !== u.nickname) return
  await purgeAccount(u.role, u.id)
  ElMessage.success('已彻底删除该账号')
  refresh()
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">信用分管理</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-alert type="info" :closable="false" show-icon class="mb-16">
      依据往期订单评价与成交情况调整信用分。信用分在学生 / 教师列表和个人主页直接展示。
    </el-alert>
    <el-table :data="users" v-loading="loading" border stripe>
      <el-table-column label="类型" width="80">
        <template #default="{ row }"><el-tag :type="row.role === 'teacher' ? 'primary' : 'success'" effect="plain" size="small">{{ row.role === 'teacher' ? '老师' : '学生' }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="nickname" label="昵称" min-width="130">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="goArchive(row, 'profile')">{{ row.nickname }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="年级" min-width="100"><template #default="{ row }">{{ gradeLabel(row.grade) }}</template></el-table-column>
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusOf(row).type" size="small" effect="plain">{{ statusOf(row).text }}</el-tag></template></el-table-column>
      <el-table-column label="信用分" width="100"><template #default="{ row }"><b :style="{ color: row.credit >= 100 ? '#1d9e75' : '#c4562c' }">{{ row.credit }}</b></template></el-table-column>
      <el-table-column label="查看" width="160">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="goArchive(row, 'profile')">个人主页</el-button>
          <el-button size="small" type="primary" link @click="goArchive(row, 'orders')">历史订单</el-button>
        </template>
      </el-table-column>
      <el-table-column label="快捷调整" width="150">
        <template #default="{ row }">
          <el-button size="small" type="success" text @click="quick(row, +5)">+5</el-button>
          <el-button size="small" type="danger" text @click="quick(row, -5)">-5</el-button>
          <el-button size="small" type="warning" text @click="quick(row, -20)">-20</el-button>
        </template>
      </el-table-column>
      <el-table-column label="自定义" width="200">
        <template #default="{ row }">
          <div class="flex gap-8">
            <el-input-number v-model="deltas[key(row)]" :min="-100" :max="100" size="small" :controls="false" placeholder="±" />
            <el-button size="small" type="primary" plain @click="apply(row)">应用</el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="账号操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== -2" size="small" type="warning" link @click="deactivate(row)">注销账号</el-button>
          <el-button v-else size="small" type="success" link @click="restore(row)">恢复账号</el-button>
          <el-button size="small" type="danger" link @click="purge(row)">彻底删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
