<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type UploadUserFile } from 'element-plus'
import http from '@/api/http'
import { getOrderAdmin, uploadInfoFeeQr, type AdminOrderDetailView } from '@/api/admin'
import { timetableSummary } from '@/utils/timetable'
import { DEPOSIT_AMOUNT } from '@/utils/order'
import { useResponsive } from '@/composables/useResponsive'

const { descCols } = useResponsive()

const route = useRoute()
const router = useRouter()
const oid = Number(route.params.id)

const data = ref<AdminOrderDetailView | null>(null)
const loading = ref(true)
const savingQr = ref(false)

function timeText(): string {
  if (!data.value) return ''
  const s = timetableSummary(data.value.timeTables)
  if (!s.length) return '待双方确认'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('；')
}
function feeItems(): { label: string; done: boolean }[] {
  const v = data.value!.verification
  const info = data.value!.infoFee || 0
  return [
    { label: `教师定金 ¥${DEPOSIT_AMOUNT}`, done: (v & 1) === 1 },
    { label: `学生定金 ¥${DEPOSIT_AMOUNT}`, done: (v & 2) === 2 },
    { label: `教师信息费 ¥${info}`, done: (v & 4) === 4 },
  ]
}

/** 上传信息费收款码（教师据此支付信息费） */
async function onQrFile(f: UploadUserFile) {
  const raw = f.raw
  if (!raw) return
  savingQr.value = true
  try {
    const fd = new FormData()
    fd.append('file', raw)
    const res = await http.post<{ url: string }>('/api/upload', fd)
    await uploadInfoFeeQr(oid, res.url)
    ElMessage.success('收款码已更新（教师端缴费页即时可见）')
    const v = await getOrderAdmin(oid)
    if (v) data.value = v
  } catch {
    /* http 已弹错 */
  } finally {
    savingQr.value = false
  }
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
        <el-descriptions :column="descCols" border class="mt-16">
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

      <el-card shadow="never">
        <template #header>凭证与收款码</template>
        <div v-if="data.teaDepositImg || data.stuDepositImg || data.infoFeeImg || data.infoFeeQr" class="imgs">
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
        <div class="qr-upload">
          <el-upload action="#" :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="onQrFile">
            <el-button size="small" type="primary" plain :loading="savingQr">
              {{ data.infoFeeQr ? '更换信息费收款码' : '上传信息费收款码（教师据此缴费）' }}
            </el-button>
          </el-upload>
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
.qr-upload {
  margin-top: 14px;
  border-top: 1px dashed #eef1f6;
  padding-top: 14px;
}
.muted {
  color: #909399;
  font-size: 12px;
}
</style>