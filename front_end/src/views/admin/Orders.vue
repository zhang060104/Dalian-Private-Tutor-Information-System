<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listAllOrders, type AdminOrderRow } from '@/api/admin'

const router = useRouter()
const rows = ref<AdminOrderRow[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    rows.value = await listAllOrders()
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(r: AdminOrderRow) {
  router.push(`/admin/order/${r.id}`)
}
function tagType(r: AdminOrderRow): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (r.status === 12) return 'info'
  if (r.status === 5) return 'warning'
  if (r.status >= 9 && r.status <= 11) return 'success'
  if (r.status <= 4) return 'primary'
  return 'danger'
}
</script>

<template>
  <div v-loading="loading">
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">全部订单</h2>
      <el-button size="small" @click="load">刷新</el-button>
    </div>
    <el-card shadow="never">
      <el-table :data="rows" stripe @row-click="open" style="cursor: pointer">
        <el-table-column label="订单号" width="90">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column prop="studentName" label="学生" min-width="110" />
        <el-table-column prop="teacherName" label="教师" min-width="110" />
        <el-table-column prop="subjectsText" label="科目" min-width="130" />
        <el-table-column label="时薪" width="90">
          <template #default="{ row }">¥{{ row.hourlyWage }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="130">
          <template #default="{ row }">
            <el-tag :type="tagType(row)" effect="light">{{ row.statusName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stageName" label="阶段" width="100" />
        <el-table-column label="创建时间" width="150">
          <template #default="{ row }">{{ row.createdAt.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.mb-16 {
  margin-bottom: 16px;
}
</style>