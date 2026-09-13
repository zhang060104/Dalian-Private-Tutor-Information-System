<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { RequestDTO } from '@/api/admin'
import { TODO_POLL_INTERVAL, useAdminTodo } from '@/composables/useAdminTodo'

const router = useRouter()

// 待办数据与侧栏红标共用同一份状态（见 composables/useAdminTodo.ts）
const { items, loading, counts, updatedAt, lastError, refreshTodo, startTodoPolling, stopTodoPolling } =
  useAdminTodo()

/** 轮询周期（秒），用于界面提示 */
const pollSeconds = TODO_POLL_INTERVAL / 1000

/** 手动刷新：显示 loading、失败弹提示 */
function manualRefresh() {
  void refreshTodo({ silent: false, showLoading: true })
}

/** 最后更新时间文案 */
const updatedText = computed(() => {
  if (!updatedAt.value) return '尚未更新'
  const d = new Date(updatedAt.value)
  const p = (n: number) => String(n).padStart(2, '0')
  return `最后更新 ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

// 只有停留在待办概览页时才轮询，离开立即停止
onMounted(() => startTodoPolling())
onBeforeUnmount(() => stopTodoPolling())

function descOf(i: RequestDTO): string {
  const t = i.type
  const tid = i.tarId ?? (i.payload as { orderId?: number })?.orderId ?? (i.payload as { id?: number })?.id
  if (t === 0 || t === 1) {
    // 后端 requestView 对 0/1 附带 targetName/targetPhone；payload 内 profile.nickname/phone 兜底
    const payload = i.payload as { name?: string; profile?: Record<string, unknown> }
    const profile = payload.profile ?? {}
    const nickname = i.targetName ?? payload.name ?? profile.nickname ?? '账号'
    const phone = i.targetPhone ?? profile.phone ?? '—'
    return `${nickname}（${phone}）`
  }
  if (t === 2) return `教师定金核验（订单 #${tid}）`
  if (t === 3) return `学生定金核验（订单 #${tid}）`
  if (t === 4) return `信息费核验（订单 #${tid}）`
  return `毁约仲裁（订单 #${tid}）`
}
</script>

<template>
  <div v-loading="loading">
    <h2 class="h2">后台概览</h2>
    <el-row :gutter="16" class="cards">
      <el-col :span="8">
        <el-card shadow="never" class="card" :class="{ alert: counts.user > 0 }" @click="router.push('/admin/users')">
          <div class="num">{{ counts.user }}</div>
          <div class="lbl">待处理 · 注册与资料审核</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" :class="{ alert: counts.payment > 0 }" @click="router.push('/admin/payments')">
          <div class="num">{{ counts.payment }}</div>
          <div class="lbl">待核验 · 缴费</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="card" :class="{ alert: counts.arbit > 0 }" @click="router.push('/admin/arbitrations')">
          <div class="num">{{ counts.arbit }}</div>
          <div class="lbl">待处理 · 毁约仲裁</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card shadow="never" class="mt-16">
      <template #header>
        <div class="flex-between">
          <span>待办快速一览</span>
          <div class="head-right">
            <span class="poll-hint">每 {{ pollSeconds }} 秒自动刷新 · {{ updatedText }}</span>
            <el-button size="small" @click="manualRefresh">刷新</el-button>
          </div>
        </div>
      </template>
      <div v-if="lastError" class="poll-err">自动刷新失败：{{ lastError }}（已保留上一次结果）</div>
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
.card.alert {
  border-color: #e63946;
}
.card.alert .num {
  color: #e63946;
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
.head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.poll-hint {
  font-size: 12px;
  color: #909399;
}
.poll-err {
  font-size: 12px;
  color: #e63946;
  margin-bottom: 8px;
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

@media (max-width: 768px) {
  .head-right {
    gap: 8px;
  }
  .poll-hint {
    display: none;
  }
}
</style>
