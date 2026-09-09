<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRequests, resolveRequest, type RequestDTO } from '@/api/admin'

const items = ref<RequestDTO[]>([])
const loading = ref(true)

const kindLabel: Record<number, string> = {
  2: '教师定金',
  3: '学生定金',
  4: '教师信息费',
}

const pays = computed(() => items.value.filter((i) => i.type >= 2 && i.type <= 4))

async function refresh() {
  loading.value = true
  try {
    items.value = await listRequests({ pending: true, type: 2 })
    const extra = await listRequests({ pending: true, type: 3 })
    const more = await listRequests({ pending: true, type: 4 })
    items.value = [...items.value, ...extra, ...more]
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

async function pass(r: RequestDTO) {
  await ElMessageBox.confirm(
    `确认核验通过「${kindLabel[r.type] || '缴费'}」？通过后进入试课阶段（若全部费用核验完成）。`,
    '核验',
    { type: 'success' }
  )
    .then(async () => {
      await resolveRequest(r.id, { approve: true })
      ElMessage.success('已核验通过')
      refresh()
    })
    .catch(() => {})
}
async function fail(r: RequestDTO) {
  await ElMessageBox.confirm(
    '确认打回该缴费？缴费方需重新上传截图。',
    '打回',
    { type: 'warning' }
  )
    .then(async () => {
      await resolveRequest(r.id, { approve: false })
      ElMessage.success('已打回')
      refresh()
    })
    .catch(() => {})
}

function payImage(r: RequestDTO): string | undefined {
  return (r.payload as { imageUrl?: string })?.imageUrl
}
function payerLabel(r: RequestDTO): string {
  if (r.type === 2) return '由教师提交'
  if (r.type === 3) return '由学生提交'
  return '由教师提交（信息费）'
}
function orderIdOf(r: RequestDTO): number {
  return (r.payload as { orderId?: number })?.orderId ?? r.tarId ?? 0
}
</script>

<template>
  <div v-loading="loading">
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">订单缴费核验</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!pays.length" description="暂无待核验的缴费" />
    <el-card v-for="r in pays" :key="r.id" shadow="never" class="pay">
      <div class="line">
        <el-tag type="warning" effect="plain">{{ kindLabel[r.type] }}</el-tag>
        <span>订单 #{{ orderIdOf(r) }}</span>
        <span class="muted">{{ payerLabel(r) }}</span>
      </div>
      <div class="shot">
        <el-image
          v-if="payImage(r)"
          :src="payImage(r)"
          :preview-src-list="[payImage(r)!]"
          fit="contain"
          style="max-height: 220px"
        />
        <span v-else class="muted">（未上传凭证图）</span>
      </div>
      <div class="ops">
        <el-button size="small" type="success" @click="pass(r)">核验通过</el-button>
        <el-button size="small" type="danger" plain @click="fail(r)">打回</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.pay {
  margin-bottom: 14px;
}
.line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.shot {
  background: #fafcff;
  border: 1px dashed #dfe5ef;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  justify-content: center;
  min-height: 60px;
}
.ops {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.muted {
  color: #909399;
  font-size: 13px;
}
</style>