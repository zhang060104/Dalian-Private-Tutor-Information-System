<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import type { Order, Role, WeekTimeTables } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { getOrder, submitOrderInfo, confirmOrderInfo } from '@/api/orders'
import { SUBJECTS, decodeSubjects, encodeSubjects } from '@/utils/subject'
import { orderStatus } from '@/utils/order'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const oid = Number(route.params.id)
const role = (auth.role ?? 'teacher') as 'student' | 'teacher'

const order = ref<Order | null>(null)
const form = reactive({ subjects: [] as number[], hourlyWage: 0, description: '', timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables })
const captchaOk = ref(false)
const saving = ref(false)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    order.value = await getOrder(oid, role)
    // 位掩码解码为已选科目下标数组（多选）
    form.subjects = decodeSubjects(order.value.subject).map((name) => SUBJECTS.indexOf(name)).filter((i) => i >= 0)
    form.hourlyWage = order.value.hourly_wage
    form.description = order.value.description
    form.timeTables = [...order.value.timeTables] as WeekTimeTables
  } catch {
    ElMessage.error('订单不存在')
    router.replace('/orders')
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** 提交修改，交给对方审核 */
async function submitChange() {
  if (!order.value) return
  if (!form.subjects.length) return ElMessage.warning('请至少选择一个授课科目')
  if (!form.hourlyWage) return ElMessage.warning('请填写时薪')
  if (!captchaOk.value) return ElMessage.warning('请先完成滑块验证')
  saving.value = true
  try {
    await submitOrderInfo(order.value.id, role, {
      subject: encodeSubjects(form.subjects),
      hourly_wage: form.hourlyWage,
      description: form.description,
      timeTables: form.timeTables,
    })
    ElMessage.success('修改已提交，等待对方审核')
    router.replace(`/order/${oid}`)
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败')
  } finally {
    saving.value = false
  }
}

/** 对方改单后我来确认（status3 我是教师 / status4 我是学生） */
async function confirmAsReviewer() {
  if (!order.value) return
  saving.value = true
  try {
    await confirmOrderInfo(order.value.id, role)
    ElMessage.success('已确认，进入费用缴纳')
    router.replace(`/order/${oid}`)
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  } finally {
    saving.value = false
  }
}

const isReviewer = () => {
  if (!order.value) return false
  const s = order.value.status
  return (s === 3 && role === 'teacher') || (s === 4 && role === 'student')
}
</script>

<template>
  <div class="page" v-loading="loading">
    <el-page-header class="ph" @back="router.back()"><template #content>订单信息确认</template></el-page-header>

    <template v-if="order">
      <el-card shadow="never">
        <el-alert type="info" :closable="false" show-icon class="mb-16">
          当前订单状态：{{ orderStatus(order.status).name }}。{{ orderStatus(order.status).desc }}
          双方可就科目 / 时薪 / 授课时间 / 说明反复磋商，最终确认后进入费用缴纳。
        </el-alert>

        <el-form label-position="top" size="large">
          <el-form-item label="授课科目（可多选）">
            <el-select v-model="form.subjects" multiple placeholder="选择一个或多个授课科目" style="width: 100%">
              <el-option v-for="(s, i) in SUBJECTS" :key="s" :label="s" :value="i" />
            </el-select>
          </el-form-item>
          <el-form-item label="授课时薪（元/小时）">
            <el-input-number v-model="form.hourlyWage" :min="30" :step="10" style="width: 220px" />
          </el-form-item>
          <el-form-item label="授课时间安排（请与对方空余时间尽量匹配）">
            <ScheduleEditor v-model="form.timeTables" />
          </el-form-item>
          <el-form-item label="授课说明（服务内容、课程安排等）">
            <el-input v-model="form.description" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="安全验证">
            <SliderCaptcha @success="captchaOk = true" />
          </el-form-item>
        </el-form>

        <div class="acts">
          <el-button type="primary" size="large" :loading="saving" @click="submitChange">提交修改，交对方审核</el-button>
          <el-button v-if="isReviewer()" type="success" size="large" :loading="saving" @click="confirmAsReviewer">确认对方修改</el-button>
        </div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.ph {
  margin-bottom: 18px;
}
.acts {
  display: flex;
  gap: 12px;
}
</style>
