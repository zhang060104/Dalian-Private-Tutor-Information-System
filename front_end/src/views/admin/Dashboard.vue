<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listPendingRequests } from '@/api/admin'
import type { RequestView } from '@/api/admin'

const router = useRouter()
const items = ref<RequestView[]>(listPendingRequests())
function descOf(i: RequestView): string {
  if (i.kind === 'register' || i.kind === 'edit-profile') return i.summary
  if (i.kind === 'payment') return `订单 #${i.orderId} · ${i.payKind === 'infoFee' ? '信息费' : '定金'}核验`
  return `订单 #${i.tarID} · 毁约仲裁`
}
const counts = computed(() => {
  const c = { user: 0, payment: 0, arbit: 0 }
  for (const i of items.value) {
    if (i.kind === 'register' || i.kind === 'edit-profile') c.user++
    else if (i.kind === 'payment') c.payment++
    else c.arbit++
  }
  return c
})
function refresh() {
  items.value = listPendingRequests()
}
</script>

<template>
  <div>
    <h2 class="h2">后台概览</h2>
    <el-row :gutter="16" class="cards">
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/users')">
          <div class="num">{{ counts.user }}</div><div class="lbl">待处理 · 注册与资料审核</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/payments')">
          <div class="num">{{ counts.payment }}</div><div class="lbl">待核验 · 缴费</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" @click="router.push('/admin/arbitrations')">
          <div class="num">{{ counts.arbit }}</div><div class="lbl">待处理 · 毁约仲裁</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card shadow="never" class="mt-16">
      <template #header><div class="flex-between"><span>待办快速处理</span><el-button size="small" @click="refresh">刷新</el-button></div></template>
      <el-empty v-if="!items.length" description="当前没有待办，做得很好" />
      <ul v-else class="q">
        <li v-for="i in items" :key="i.id">
          <span class="type">{{ i.typeLabel }}</span><span class="muted">{{ descOf(i) }}</span>
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
