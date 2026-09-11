<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Order, Role } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { listMyOrders } from '@/api/orders'
import { decodeSubjects } from '@/utils/subject'
import { orderStatus } from '@/utils/order'

const auth = useAuthStore()
const router = useRouter()
const role = (auth.role ?? 'teacher') as 'student' | 'teacher'

const orders = ref<Order[]>([])
const loading = ref(true)
const filter = ref<'all' | 'active'>('active')

const visible = computed(() =>
  filter.value === 'all' ? orders.value : orders.value.filter((o) => o.status !== 12)
)

function open(o: Order) {
  router.push(`/order/${o.id}`)
}
async function load() {
  loading.value = true
  try {
    orders.value = await listMyOrders(role, filter.value === 'all')
  } catch {
    // http 已弹错
  } finally {
    loading.value = false
  }
}
async function onFilterChange(v: 'all' | 'active') {
  filter.value = v
  await load()
}
onMounted(load)

function statusTag(o: Order) {
  const m = orderStatus(o.status)
  const map: Record<string, string> = {
    success: '9', primary: '8,2,6,7', info: '12', warning: '5,10,11',
  }
  for (const [t, s] of Object.entries(map)) {
    if (s.split(',').includes(String(o.status))) return t
  }
  return 'primary'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">我的订单</h1>
      <el-segmented v-model="filter" :options="[{ label: '进行中', value: 'active' }, { label: '全部', value: 'all' }]" @change="onFilterChange" />
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-empty v-if="!visible.length" description="暂无订单" />
      <div v-for="o in visible" :key="o.id" class="order" @click="open(o)">
        <div class="left">
          <div class="peer">
            <b>{{ o.peer?.nickname }}</b>
            <el-tag size="small" :type="o.peer?.role === 'teacher' ? 'primary' : 'success'" effect="plain">
              {{ o.peer?.role === 'teacher' ? '老师' : '学生' }}
            </el-tag>
            <span class="credit-pill">信用 {{ o.peer?.credit }}</span>
          </div>
          <div class="info muted">
            科目 {{ decodeSubjects(o.subject).join('、') || '—' }} · 时薪 ¥{{ o.hourlyWage }}/h
          </div>
          <div class="desc">{{ o.description }}</div>
        </div>
        <div class="right">
          <el-tag :type="statusTag(o) as any" effect="dark">{{ orderStatus(o.status).name }}</el-tag>
          <div class="st muted">#{{ o.id }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #eef1f6;
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
}
.order:hover {
  border-color: #cfe0fb;
  background: #fafcff;
}
.left {
  flex: 1;
  min-width: 0;
}
.peer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.peer b {
  font-size: 16px;
  color: #1d2740;
}
.info {
  font-size: 13px;
  margin-bottom: 4px;
}
.desc {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.right {
  text-align: right;
  flex: none;
}
.st {
  font-size: 12px;
  margin-top: 4px;
}

/* ---------- 手机端 ---------- */
@media (max-width: 768px) {
  .order {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px;
  }
  .left {
    flex: 1 1 100%;
  }
  .peer {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .desc {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
  }
  .st {
    margin-top: 0;
  }
}
</style>
