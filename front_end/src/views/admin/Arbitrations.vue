<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adjustCreditAdmin, getOrderAdmin, listRequests, resolveRequest, type AdminOrderDetailView, type RequestDTO } from '@/api/admin'

const router = useRouter()
const items = ref<RequestDTO[]>([])
const orderCache = ref<Record<number, AdminOrderDetailView>>({})
const loading = ref(true)

const arbs = computed(() => items.value.filter((i) => i.type === 5))

async function refresh() {
  loading.value = true
  try {
    items.value = await listRequests({ pending: true, type: 5 })
    // 拉每个订单的详情以便拿双方姓名（后端无单查，由全量列表行组装）
    const ids = [...new Set(arbs.value.map((r) => orderIdOf(r)))]
    for (const id of ids) {
      if (!orderCache.value[id]) {
        try {
          const v = await getOrderAdmin(id)
          if (v) orderCache.value[id] = v
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

function orderIdOf(r: RequestDTO): number {
  return (r.payload as { orderId?: number })?.orderId ?? r.tarId ?? 0
}
function textOf(r: RequestDTO): string {
  return (r.payload as { text?: string })?.text ?? '（未填写描述）'
}
function evidenceOf(r: RequestDTO): string[] {
  return ((r.payload as { images?: string[] })?.images) ?? []
}
function openOrder(r: RequestDTO) {
  router.push(`/admin/order/${orderIdOf(r)}`)
}

async function resolve(r: RequestDTO, blame: 'student' | 'teacher' | 'none') {
  const o = orderCache.value[orderIdOf(r)]
  if (!o) return
  const blameText =
    blame === 'none'
      ? '双方均无违约，维持授课'
      : `裁定${blame === 'teacher' ? '教师' : '学生'}违约`
  await ElMessageBox.confirm(
    `订单 #${o.id}：${blameText}。确认？`,
    '仲裁裁定',
    { type: 'warning' }
  )
    .then(async () => {
      await resolveRequest(r.id, { approve: blame !== 'none' })
      // 简单扣分（仅在被裁定违约时执行）
      if (blame === 'teacher') {
        await adjustCreditAdmin('teacher', o.teacherId ?? 0, Math.max(0, (o.teacherCredit ?? 100) - 10)).catch(() => {})
      } else if (blame === 'student') {
        await adjustCreditAdmin('student', o.studentId ?? 0, Math.max(0, (o.studentCredit ?? 100) - 10)).catch(() => {})
      }
      ElMessage.success('仲裁已结案')
      refresh()
    })
    .catch(() => {})
}
</script>

<template>
  <div v-loading="loading">
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">订单毁约仲裁</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!arbs.length" description="暂无仲裁申请" />
    <el-card v-for="r in arbs" :key="r.id" shadow="never" class="arb">
      <div class="head">
        <el-tag type="danger" effect="plain">毁约仲裁</el-tag>
        <el-link type="primary" :underline="false" @click="openOrder(r)">
          订单 #{{ orderIdOf(r) }}
        </el-link>
        <span class="muted">订单 {{ orderIdOf(r) }}</span>
      </div>
      <div class="text">{{ textOf(r) }}</div>
      <div v-if="evidenceOf(r).length" class="muted">
        证据 {{ evidenceOf(r).length }} 张：
        <el-image
          v-for="(u, i) in evidenceOf(r)"
          :key="i"
          :src="u"
          :preview-src-list="evidenceOf(r)"
          :initial-index="i"
          style="width: 60px; height: 60px; margin-right: 6px; border-radius: 4px"
          fit="cover"
        />
      </div>
      <div v-if="orderCache[orderIdOf(r)]" class="parties">
        <span>教师：{{ orderCache[orderIdOf(r)].teacherName }}</span>
        <span>学生：{{ orderCache[orderIdOf(r)].studentName }}</span>
      </div>
      <div class="ops">
        <el-button size="small" @click="openOrder(r)">查看订单详情</el-button>
        <el-button size="small" type="primary" @click="resolve(r, 'teacher')">裁定教师违约</el-button>
        <el-button size="small" type="primary" plain @click="resolve(r, 'student')">裁定学生违约</el-button>
        <el-button size="small" type="success" plain @click="resolve(r, 'none')">双方无责结案</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.arb {
  margin-bottom: 14px;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.text {
  padding: 10px;
  background: #fafcff;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}
.parties {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.ops {
  display: flex;
  gap: 8px;
}
.muted {
  color: #909399;
  font-size: 13px;
}
</style>