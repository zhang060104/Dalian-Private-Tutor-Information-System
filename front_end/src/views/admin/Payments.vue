<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { listPendingRequests, approvePayment, rejectPayment, type RequestView } from '@/api/admin'

const auth = useAuthStore()
const items = ref<RequestView[]>([])
type PayReq = RequestView & { kind: 'payment' }
const pays = () => items.value.filter((i) => i.kind === 'payment') as PayReq[]

const kindLabel: Record<string, string> = { teaDeposit: '教师定金', stuDeposit: '学生定金', infoFee: '教师信息费' }

function refresh() {
  items.value = listPendingRequests()
}
onMounted(refresh)

function pass(r: PayReq) {
  ElMessageBox.confirm(`确认核验通过「${kindLabel[r.payKind]}」缴费？通过后进入试课阶段（若全部费用核验完成）。`, '核验', { type: 'success' })
    .then(() => {
      approvePayment(r.id, r.orderId, r.payKind)
      ElMessage.success('已核验通过')
      refresh()
    })
    .catch(() => {})
}
function fail(r: PayReq) {
  ElMessageBox.confirm('确认打回该缴费？缴费方需重新上传截图。', '打回', { type: 'warning' })
    .then(() => {
      rejectPayment(r.id)
      ElMessage.success('已打回')
      refresh()
    })
    .catch(() => {})
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">订单缴费核验</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!pays().length" description="暂无待核验的缴费" />
    <el-card v-for="r in pays()" :key="r.id" shadow="never" class="pay">
      <div class="line">
        <el-tag type="warning" effect="plain">{{ kindLabel[r.payKind] }}</el-tag>
        <span>订单 #{{ r.orderId }} · 金额 ¥{{ r.amount }}</span>
        <span class="muted">由{{ r.payerRole === 'teacher' ? '教师' : '学生' }}提交</span>
      </div>
      <div class="mock-shot">支付交易记录截图（mock 占位 #{{ r.id }}）</div>
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
.mock-shot {
  height: 90px;
  background: #fafcff;
  border: 1px dashed #dfe5ef;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa4b6;
  font-size: 13px;
}
.ops {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
</style>
