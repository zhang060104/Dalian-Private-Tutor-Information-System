<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type UploadUserFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { Order, Role } from '@/types'
import { useAuthStore } from '@/stores/auth'
import http from '@/api/http'
import {
  getOrder,
  acceptInitial,
  confirmOrderInfo,
  cancelOrder,
  uploadPayment,
  passTrial,
  requestClose,
  agreeClose,
  arbitrate,
} from '@/api/orders'
import { decodeSubjects } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'
import { orderStatus, myActions } from '@/utils/order'
import SliderCaptcha from '@/components/SliderCaptcha.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const oid = Number(route.params.id)
const role = (auth.role ?? 'teacher') as 'student' | 'teacher'
const isStudent = role === 'student'

const order = ref<Order | null>(null)
const loading = ref(true)
const acting = ref(false)

const actions = computed(() => (order.value ? myActions(order.value, role) : null))

function meta() {
  return order.value ? orderStatus(order.value.status) : null
}
function stageText(s: string | undefined): string {
  const map: Record<string, string> = {
    resume: '简历匹配',
    confirm: '信息确认',
    payment: '费用缴纳',
    trial: '试课',
    active: '授课服务',
    closing: '结单',
    closed: '已结束',
    dispute: '仲裁',
  }
  return s ? map[s] ?? s : ''
}

/** 真实上传：multipart 到 /api/upload，返回 url（登录态走 Authorization，勿手动设置 Content-Type） */
async function uploadOne(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await http.post<{ url: string }>('/api/upload', fd)
  return res.url
}

// 缴费
const payDlg = ref(false)
const payKind = ref<'teaDeposit' | 'stuDeposit' | 'infoFee'>('teaDeposit')
const payFile = ref<UploadUserFile | null>(null)
const payCaptcha = ref(false)

function depositKinds(): {
  kind: 'teaDeposit' | 'stuDeposit' | 'infoFee'
  label: string
  amount: number
  done: boolean
  /** 我上传的凭证回显（上传后未核验期间） */
  uploaded?: string
}[] {
  const o = order.value!
  const list = [] as {
    kind: 'teaDeposit' | 'stuDeposit' | 'infoFee'
    label: string
    amount: number
    done: boolean
    uploaded?: string
  }[]
  if (isStudent) {
    list.push({ kind: 'stuDeposit', label: '学生定金', amount: o.hourlyWage, done: (o.verification & 2) === 2, uploaded: o.stuDepositImg })
  } else {
    list.push({ kind: 'teaDeposit', label: '教师定金', amount: o.hourlyWage, done: (o.verification & 1) === 1, uploaded: o.teaDepositImg })
    list.push({
      kind: 'infoFee',
      label: '信息费（首周）',
      amount: o.infoFee || o.hourlyWage * 2,
      done: (o.verification & 4) === 4,
      uploaded: o.infoFeeImg,
    })
  }
  return list
}
function openPay(kind: 'teaDeposit' | 'stuDeposit' | 'infoFee') {
  payKind.value = kind
  payFile.value = null
  payCaptcha.value = false
  payDlg.value = true
}
async function submitPay() {
  if (!order.value) return
  if (!payFile.value?.raw) return ElMessage.warning('请上传支付交易截图')
  if (!payCaptcha.value) return ElMessage.warning('请完成滑块验证')
  acting.value = true
  try {
    const url = await uploadOne(payFile.value.raw)
    const kindMap: Record<typeof payKind.value, 'depositTea' | 'depositStu' | 'infoFee'> = {
      teaDeposit: 'depositTea',
      stuDeposit: 'depositStu',
      infoFee: 'infoFee',
    }
    await uploadPayment(order.value.id, kindMap[payKind.value], url)
    ElMessage.success('已上传，等待管理员核验')
    payDlg.value = false
    reload()
  } finally {
    acting.value = false
  }
}

// 通用确认操作
async function doAction(fn: () => Promise<void>, msg: string) {
  acting.value = true
  try {
    await fn()
    ElMessage.success(msg)
    reload()
  } finally {
    acting.value = false
  }
}
function onPrimary() {
  const o = order.value!
  const st = o.status
  if (st === 0 || st === 1) return doAction(() => acceptInitial(o.id), '已接受，进入订单信息确认')
  if (st === 3 || st === 4) return doAction(() => confirmOrderInfo(o.id), '已确认订单信息，进入费用缴纳')
  if (st === 7 && !isStudent) return doAction(() => passTrial(o.id), '试课通过，正式进入授课')
  if (st === 8 && isStudent) return doAction(() => passTrial(o.id), '试课通过，正式进入授课')
  if (st === 10 && isStudent) return doAction(() => agreeClose(o.id), '已同意结单')
  if (st === 11 && !isStudent) return doAction(() => agreeClose(o.id), '已同意结单')
}

// 仲裁
const arbDlg = ref(false)
const arbText = ref('')
const arbEvidence = ref<UploadUserFile[]>([])
const arbCaptcha = ref(false)
// 弹窗每次打开都重置（destroy-on-close 重建滑块，旧成功状态失效）
function openArbDlg() {
  arbText.value = ''
  arbEvidence.value = []
  arbCaptcha.value = false
  arbDlg.value = true
}
async function submitArbitration() {
  if (!order.value) return
  if (!arbText.value.trim()) return ElMessage.warning('请描述违约情况')
  if (!arbCaptcha.value) return ElMessage.warning('请完成滑块验证')
  acting.value = true
  try {
    const urls: string[] = []
    for (const f of arbEvidence.value) {
      if (f.raw) urls.push(await uploadOne(f.raw))
    }
    await arbitrate(order.value.id, arbText.value, urls)
    ElMessage.success('已提交仲裁申请')
    arbDlg.value = false
    arbEvidence.value = []
    arbText.value = ''
  } finally {
    acting.value = false
  }
}

function timeText(): string {
  const s = timetableSummary(order.value?.timeTables ?? [0, 0, 0, 0, 0, 0, 0])
  if (!s.length) return '待双方确认'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('；')
}
async function reload() {
  order.value = await getOrder(oid, role)
}
function goEdit() {
  router.push(`/order/${oid}/edit`)
}

onMounted(async () => {
  loading.value = true
  try {
    order.value = await getOrder(oid, role)
  } catch {
    ElMessage.error('订单不存在')
    router.replace('/orders')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <el-page-header class="ph" @back="router.back()">
      <template #content>订单详情 · #{{ oid }}</template>
    </el-page-header>

    <template v-if="order && actions">
      <el-card shadow="never" class="mb-16">
        <div class="top-line">
          <span class="st-name">{{ meta()?.name }}</span>
          <el-tag size="small" effect="plain" type="warning">{{ meta()?.stage === 'closed' ? '已结束' : stageText(meta()?.stage) }}</el-tag>
          <span class="credit-pill">信用 {{ order.peer?.credit }}</span>
        </div>
        <div class="st-desc muted">{{ meta()?.desc }}</div>

        <el-descriptions :column="2" border class="mt-16">
          <el-descriptions-item label="对方">
            {{ order.peer?.nickname }}（{{ order.peer?.role === 'teacher' ? '老师' : '学生' }}）
          </el-descriptions-item>
          <el-descriptions-item label="授课科目">{{ decodeSubjects(order.subject).join('、') || '—' }}</el-descriptions-item>
          <el-descriptions-item label="时薪">{{ order.hourlyWage }} 元/小时</el-descriptions-item>
          <el-descriptions-item label="信息费(教师缴)">¥{{ order.infoFee || order.hourlyWage * 2 }}</el-descriptions-item>
          <el-descriptions-item label="授课时间" :span="2"><span class="tp">{{ timeText() }}</span></el-descriptions-item>
          <el-descriptions-item label="订单说明" :span="2">{{ order.description }}</el-descriptions-item>
          <el-descriptions-item v-if="order.visibleContact" label="对方联系方式" :span="2">
            <b class="c-ph">{{ order.visibleContact.phone }}</b><span class="muted">（缴费核验完成，已可联系沟通试课）</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 缴费核验状态 -->
      <el-card v-if="actions.needDeposit || (order.status >= 5 && order.status <= 6)" shadow="never" class="mb-16">
        <template #header>费用缴纳与核验</template>
        <div class="pays">
          <div v-for="k in depositKinds()" :key="k.kind" class="pay-item" :class="{ done: k.done }">
            <div class="pay-l">
              <b>{{ k.label }}</b>
              <span class="muted">金额 ¥{{ k.amount }}</span>
            </div>
            <template v-if="k.done">
              <el-tag type="success" effect="plain">已核验</el-tag>
            </template>
            <template v-else-if="k.uploaded">
              <div class="flex gap-8" style="align-items: center">
                <el-image :src="k.uploaded" :preview-src-list="[k.uploaded]" preview-teleported fit="cover" style="width: 44px; height: 44px; border-radius: 6px" />
                <el-tag type="info" effect="plain">已上传，待管理员核验</el-tag>
              </div>
            </template>
            <el-button v-else size="small" type="primary" plain @click="openPay(k.kind)">上传付款截图</el-button>
          </div>
          <!-- 平台信息费收款码：教师端在缴费期查看 -->
          <div v-if="order.infoFeeQr && !isStudent" class="flex gap-8" style="align-items: flex-start; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eef1f6">
            <div style="width: 110px; height: 110px; flex: none; border: 1px solid #eef1f6; border-radius: 8px; overflow: hidden">
              <el-image :src="order.infoFeeQr" :preview-src-list="[order.infoFeeQr]" preview-teleported fit="contain" style="width: 100%; height: 100%" />
            </div>
            <div class="muted" style="font-size: 13px; line-height: 1.7">扫描平台收款码支付<b style="color:#e6a23c">信息费 ¥{{ order.infoFee || order.hourlyWage * 2 }}</b>，支付成功后截图上传核验（教师本人操作）</div>
          </div>
        </div>
        <div v-if="order.status === 6" class="trial-tip">
          <el-alert type="success" :closable="false" title="费用已核验，进入试课阶段。现可查看对方联系方式安排试课，试课后双方确认是否正式授课。" />
        </div>
      </el-card>

      <!-- 我的操作 -->
      <el-card shadow="never" class="mb-16">
        <template #header>操作</template>
        <div class="acts">
          <el-button v-if="actions.primary" type="primary" size="large" :loading="acting" @click="onPrimary">{{ actions.primary }}</el-button>
          <span v-else-if="actions.waiting" class="muted" style="font-size: 14px">⏳ {{ actions.waiting }}</span>
          <el-button v-if="actions.canEditInfo" size="large" @click="goEdit">修改订单信息</el-button>
          <el-button v-if="actions.canClose" size="large" type="warning" plain @click="doAction(() => requestClose(order!.id), '已发起结单请求，等待对方同意')">发起结单</el-button>
          <el-button v-if="actions.canPassTrial && order.status === 6" size="large" type="success" @click="doAction(() => passTrial(order!.id), '已标记试课通过，等待对方确认')">试课通过</el-button>
          <el-button v-if="actions.canArbitrate" size="large" type="danger" plain @click="openArbDlg">申请毁约仲裁</el-button>
          <el-button v-if="actions.canCancel" size="small" text type="danger" @click="doAction(() => cancelOrder(order!.id), order.status <= 1 ? '已撤回该申请' : '订单已取消并结束')">{{ order.status <= 1 ? '撤回申请' : '取消订单' }}</el-button>
          <el-button v-if="actions.closed" size="large" type="info" disabled>订单已结束</el-button>
        </div>
      </el-card>
    </template>

    <!-- 缴费弹窗 -->
    <el-dialog v-model="payDlg" title="上传缴费凭证" width="460px" destroy-on-close>
      <el-alert type="warning" :closable="false" show-icon class="mb-16">请上传真实支付成功的交易记录截图，用于管理员核验。</el-alert>
      <el-upload action="#" :auto-upload="false" :limit="1" list-type="picture-card" accept="image/*" :on-change="(f: UploadUserFile) => (payFile = f)">
        <el-icon><Plus /></el-icon>
      </el-upload>
      <el-form-item label="安全验证" class="mt-16"><SliderCaptcha @success="payCaptcha = true" /></el-form-item>
      <template #footer>
        <el-button @click="payDlg = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="submitPay">提交核验</el-button>
      </template>
    </el-dialog>

    <!-- 仲裁弹窗 -->
    <el-dialog v-model="arbDlg" title="申请毁约仲裁" width="520px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="违约情况描述"><el-input v-model="arbText" type="textarea" :rows="4" placeholder="请如实描述对方违约情况" /></el-form-item>
        <el-form-item label="证据图片（选填）">
          <el-upload action="#" :auto-upload="false" list-type="picture-card" accept="image/*" :limit="4" :on-change="(f: UploadUserFile) => arbEvidence.push(f)" :on-remove="(f: UploadUserFile) => (arbEvidence = arbEvidence.filter((x) => x.uid !== f.uid))">
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="安全验证"><SliderCaptcha @success="arbCaptcha = true" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="arbDlg = false">取消</el-button>
        <el-button type="danger" :loading="acting" @click="submitArbitration">提交仲裁</el-button>
      </template>
    </el-dialog>
  </div>
</template>

