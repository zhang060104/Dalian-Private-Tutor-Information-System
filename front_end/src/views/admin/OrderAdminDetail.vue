<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderAdmin, type AdminOrderDetailView } from '@/api/admin'
import { timetableSummary } from '@/utils/timetable'

const route = useRoute()
const router = useRouter()
const oid = Number(route.params.id)

const data = ref<AdminOrderDetailView | null>(null)
const loading = ref(true)

function timeText(): string {
  if (!data.value) return ''
  const s = timetableSummary(data.value.timeTables)
  if (!s.length) return '待双方确认'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('；')
}
function feeItems(): { label: string; done: boolean }[] {
  const v = data.value!.verification
  return [
    { label: '教师定金', done: (v & 1) === 1 },
    { label: '学生定金', done: (v & 2) === 2 },
    { label: '教师信息费', done: (v & 4) === 4 },
  ]
}
onMounted(async () => {
  loading.value = true
  try {
    const v = await getOrderAdmin(oid)
    if (!v) {
      ElMessage.error('订单不存在')
      router.replace('/admin/orders')
      return
    }
    data.value = v
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <el-page-header class="ph" @back="router.back()">
      <template #content>订单详情 · #{{ oid }}</template>
    </el-page-header>

    <template v-if="data">
      <el-card shadow="never" class="mb-16">
        <div class="top-line">
          <el-tag type="primary" effect="light">{{ data.statusName }}</el-tag>
          <span class="muted">{{ data.statusDesc }}</span>
        </div>
        <el-descriptions :column="2" border class="mt-16">
          <el-descriptions-item label="学生">
            {{ data.studentName }}
            <span v-if="data.studentPhone" class="muted">（{{ data.studentPhone }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="教师">
            {{ data.teacherName }}
            <span v-if="data.teacherPhone" class="muted">（{{ data.teacherPhone }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="授课科目">{{ data.subjectsText }}</el-descriptions-item>
          <el-descriptions-item label="时薪">¥{{ data.hourlyWage }} / 小时</el-descriptions-item>
          <el-descriptions-item label="信息费（教师缴）">¥{{ data.infoFee }}</el-descriptions-item>
          <el-descriptions-item label="授课时间"><span class="tp">{{ timeText() }}</span></el-descriptions-item>
          <el-descriptions-item label="订单说明" :span="2">{{ data.description }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" class="mb-16">
        <template #header>缴费核验情况</template>
        <div class="fee">
          <div v-for="f in feeItems()" :key="f.label" class="fee-item">
            <span>{{ f.label }}</span>
            <el-tag :type="f.done ? 'success' : 'info'" effect="plain">{{ f.done ? '已缴' : '未缴' }}</el-tag>
          </div>
        </div>
      </el-card>

      <el-card v-if="data.teaDepositImg || data.stuDepositImg || data.infoFeeImg || data.infoFeeQr" shadow="never">
        <template #header>凭证与收款码</template>
        <div class="imgs">
          <div v-if="data.teaDepositImg" class="im">
            <div class="lbl">教师定金凭证</div>
            <el-image :src="data.teaDepositImg" :preview-src-list="[data.teaDepositImg]" fit="contain" style="max-height: 160px" />
          </div>
          <div v-if="data.stuDepositImg" class="im">
            <div class="lbl">学生定金凭证</div>
            <el-image :src="data.stuDepositImg" :preview-src-list="[data.stuDepositImg]" fit="contain" style="max-height: 160px" />
          </div>
          <div v-if="data.infoFeeImg" class="im">
            <div class="lbl">信息费凭证</div>
            <el-image :src="data.infoFeeImg" :preview-src-list="[data.infoFeeImg]" fit="contain" style="max-height: 160px" />
          </div>
          <div v-if="data.infoFeeQr" class="im">
            <div class="lbl">信息费收款码</div>
            <el-image :src="data.infoFeeQr" :preview-src-list="[data.infoFeeQr]" fit="contain" style="max-height: 160px" />
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.ph {
  margin-bottom: 18px;
}
.top-line {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tp {
  white-space: pre-line;
  line-height: 1.7;
}
.fee {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.fee-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.imgs {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.im {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lbl {
  font-size: 12px;
  color: #909399;
}
.muted {
  color: #909399;
  font-size: 12px;
}
</style>