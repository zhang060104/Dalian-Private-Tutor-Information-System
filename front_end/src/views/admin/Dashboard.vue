<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listRequests, type RequestDTO } from '@/api/admin'

const router = useRouter()
const items = ref<RequestDTO[]>([])
const loading = ref(true)

async function refresh() {
  loading.value = true
  try {
    items.value = await listRequests({ pending: true })
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

function descOf(i: RequestDTO): string {
  const t = i.type
  const tid = (i as unknown as { tarId?: number }).tarId ?? (i.payload as { orderId?: number })?.orderId ?? (i.payload as { id?: number })?.id
  if (t === 0 || t === 1) {
    const phone = (i.payload as { phone?: string })?.phone ?? ''
    const nickname = (i.payload as { nickname?: string })?.nickname ?? ''
    return `${nickname || '账号'}（${phone || '—'}）`
  }
  if (t === 2) return `教师定金核验（订单 #${tid}）`
  if (t === 3) return `学生定金核验（订单 #${tid}）`
  if (t === 4) return `信息费核验（订单 #${tid}）`
  return `毁约仲裁（订单 #${tid}）`
}

const counts = computed(() => {
  const c = { user: 0, payment: 0, arbit: 0 }
  for (const i of items.value) {
    if (i.type === 0 || i.type === 1) c.user++
    else if (i.type >= 2 && i.type <= 4) c.payment++
    else if (i.type === 5) c.arbit++
  }
  return c
})
</script>

<template>
  <div v-loading="loading">
    <h2 class="h2">后台概览</h2>
    <el-row :gutter="16" class="cards">
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/users')">
          <div class="num">{{ counts.user }}</div>
          <div class="lbl">待处理 · 注册与资料审核</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/payments')">
          <div class="num">{{ counts.payment }}</div>
          <div class="lbl">待核验 · 缴费</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/arbitrations')">
          <div class="num">{{ counts.arbit }}</div>
          <div class="lbl">待处理 · 毁约仲裁</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card shadow="never" class="mt-16">
      <template #header>
        <div class="flex-between">
          <span>待办快速一览</span>
          <el-button size="small" @click="refresh">刷新</el-button>
        </div>
      </template>
      <el-empty v-if="!items.length" description="当前没有待办，做得很好" />
      <ul v-else class="q">
        <li v-for="i in items" :key="i.id">
          <span class="type">{{ i.typeName }}</span>
          <span class="muted">{{ descOf(i) }}</span>
        </li>
      </ul>
    </el-card>
  </div>
</template>

<style scoped>
.h2 {
  font-size: 18px;
  margin-bottom: 16px;
}
.card {
  cursor: pointer;
  text-align: center;
  padding: 8px;
}
.num {
  font-size: 34px;
  font-weight: 600;
  color: #2f7cf6;
}
.lbl {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.q {
  list-style: none;
  padding: 0;
}
.q li {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed #eef1f6;
  font-size: 14px;
}
.type {
  color: #2f7cf6;
  flex: none;
}
</style>