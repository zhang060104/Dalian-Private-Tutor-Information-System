<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Role } from '@/types'
import { adjustCreditAdmin, listAllUsers } from '@/api/admin'
import { gradeLabel } from '@/utils/grade'

const router = useRouter()
const users = ref<ReturnType<typeof listAllUsers>>([])
const deltas = ref<Record<string, number>>({})
const loading = ref(true)

function refresh() {
  users.value = listAllUsers()
  loading.value = false
}
onMounted(refresh)

function goArchive(u: { role: 'student' | 'teacher'; id: number }, tab: 'profile' | 'orders') {
  router.push(`/admin/user/${u.role}/${u.id}${tab === 'orders' ? '?tab=orders' : ''}`)
}

function apply(u: { role: 'student' | 'teacher'; id: number }) {
  const delta = deltas.value[`${u.role}-${u.id}`] ?? 0
  if (!delta) return ElMessage.warning('请输入调整值（正数加、负数减）')
  adjustCreditAdmin(u.role, u.id, delta)
  ElMessage.success('已调整')
  refresh()
}
function quick(u: { role: 'student' | 'teacher'; id: number }, d: number) {
  adjustCreditAdmin(u.role, u.id, d)
  ElMessage.success(`已${d > 0 ? '加' : '减'}${Math.abs(d)} 信用分`)
  refresh()
}

const key = (u: { role: Role; id: number }) => `${u.role}-${u.id}`
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
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.seeking ? 'success' : 'info'" size="small" effect="plain">{{ row.seeking ? '寻找中' : '已停止' }}</el-tag></template></el-table-column>
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
    </el-table>
  </div>
</template>
