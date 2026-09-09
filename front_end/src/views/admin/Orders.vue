<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listAllOrders, type AdminOrderRow } from '@/api/admin'

const router = useRouter()
const rows = ref<AdminOrderRow[]>([])
const loading = ref(false)

function load() {
  loading.value = true
  try {
    rows.value = listAllOrders()
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(r: AdminOrderRow) {
  router.push(`/admin/order/${r.id}`)
}
/** 状态 tag 颜色（可按业务阶段弱区分） */
function tagType(r: AdminOrderRow): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (r.status === 12) return 'info'
  if (r.status === 5) return 'warning'
  if (r.status === 9 || r.status === 10 || r.status === 11) return 'success'
  if (r.status === 0 || r.status === 1 || r.status === 2 || r.status === 3 || r.status === 4) return 'primary'
  return 'danger'
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">全部订单</h2>
      <el-button size="small" @click="load">刷新</el-button>
    </div>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" stripe @row-click="open" style="cursor: pointer">
        <el-table-column label="订单号" width="90">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column prop="studentName" label="学生" min-width="110" />
        <el-table-column prop="teacherName" label="教师" min-width="110" />
        <el-table-column prop="subjectsText" label="授课科目" min-width="140" />
        <el-table-column label="时薪" width="90">
          <template #default="{ row }">¥{{ row.hourly_wage }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="140">
          <template #default="{ row }">
            <el-tag :type="tagType(row)" effect="light">{{ row.statusName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stageName" label="阶段" width="100" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="open(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !rows.length" description="暂无订单" style="margin-top: 8px" />
    </el-card>
  </div>
</template>
