<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getUserAdmin,
  getUserArchiveAdmin,
  listOrdersForUserAdmin,
  type AdminOrderRow,
  type AdminUserArchive,
  type AdminUserView,
} from '@/api/admin'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'
import { useResponsive } from '@/composables/useResponsive'

const { descCols } = useResponsive()

const route = useRoute()
const router = useRouter()
const role = (route.params.role as string) as 'student' | 'teacher'
const id = Number(route.params.id)

const profile = ref<AdminUserView | null>(null)
const orders = ref<AdminOrderRow[]>([])
/** 用户完整档案（全字段资料 + 统计 + 缴费凭证 + 审核记录） */
const archive = ref<AdminUserArchive | null>(null)
const loading = ref(true)
const activeTab = ref(route.query.tab === 'orders' ? 'orders' : 'profile')

function subjectsText(): string {
  return profile.value ? decodeSubjects(profile.value.subject).join('、') || '—' : '—'
}
function timeText(): string {
  const s = timetableSummary(profile.value?.timeTables ?? [0, 0, 0, 0, 0, 0, 0])
  if (!s.length) return '时间待定'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('；')
}
function statusTag(t: 'student' | 'teacher'): 'primary' | 'success' {
  return t === 'teacher' ? 'primary' : 'success'
}
function openOrder(r: AdminOrderRow) {
  router.push(`/admin/order/${r.id}`)
}
function orderTag(row: AdminOrderRow): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (row.status === 12) return 'info'
  if (row.status === 5) return 'warning'
  if (row.status >= 9 && row.status <= 11) return 'success'
  return 'primary'
}
const otherRole = computed(() => (role === 'student' ? 'teacher' : 'student'))
const otherLabel = computed(() => (role === 'student' ? '教师' : '学生'))

/** 审核记录行类型 */
type LogRow = AdminUserArchive['logs'][number]

/** 读取原始实体字段（后端 profile 为全字段对象） */
function f(key: string): string {
  const v = archive.value?.profile?.[key]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}
/** 读取资料图片字段（无则 null） */
function img(key: string): string | null {
  const v = archive.value?.profile?.[key]
  return typeof v === 'string' && v ? v : null
}
/** 时间表 7 天明细（每天 24 小时位掩码） */
function weeklyDetail(): { day: string; slots: number }[] {
  const p = (archive.value?.profile ?? {}) as Record<string, unknown>
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return names.map((day, i) => ({ day, slots: Number(p[`timeTable${i + 1}`] ?? 0) }))
}
function slotsText(mask: number): string {
  const s = timetableSummary([mask, 0, 0, 0, 0, 0, 0])
  return s.length ? s[0].slots.join(' ') : '—'
}
const STATUS_TEXT: Record<string, string> = { '-2': '已注销', '-1': '待审核', '0': '寻找中', '1': '已暂停' }
function statusText(s: unknown): string {
  return STATUS_TEXT[String(s)] ?? `未知(${s})`
}
function statusType(s: unknown): 'success' | 'info' | 'warning' | 'danger' {
  const n = Number(s)
  if (n === -2) return 'danger'
  if (n === -1) return 'warning'
  return n === 0 ? 'success' : 'info'
}
/** 核验位：bit0 教师定金 bit1 学生定金 bit2 信息费 */
function verBits(v: number) {
  return { tea: (v & 1) === 1, stu: (v & 2) === 2, info: (v & 4) === 4 }
}
/** 审核/操作记录：是否待处理（adminId = -1） */
function isPending(r: LogRow): boolean {
  return r.adminId === -1
}
/** 审核/操作记录摘要（payload 中的 kind / name） */
function logSummary(r: LogRow): string {
  const p = (r.payload ?? {}) as Record<string, unknown>
  const parts = [p['kind'], p['name'] ?? r.targetName].filter((x) => x !== undefined && x !== null && x !== '')
  return parts.length ? parts.map((x) => String(x)).join(' / ') : '—'
}
function openOrderById(oid: number) {
  router.push(`/admin/order/${oid}`)
}

onMounted(async () => {
  loading.value = true
  try {
    profile.value = await getUserAdmin(role, id)
    if (!profile.value) {
      ElMessage.error('用户不存在')
      router.replace('/admin/credit')
      return
    }
    orders.value = await listOrdersForUserAdmin(role, id)
    archive.value = await getUserArchiveAdmin(role, id)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <el-page-header class="ph" @back="router.back()">
      <template #content>
        用户档案 · {{ role === 'teacher' ? '老师' : '学生' }} {{ profile?.nickname ?? '#' + id }}
      </template>
    </el-page-header>

    <el-card v-if="profile" shadow="never" class="mb-16">
      <div class="head">
        <div class="avatar">{{ profile.nickname.charAt(0) }}</div>
        <div class="info">
          <div class="line1">
            <b>{{ profile.nickname }}</b>
            <el-tag :type="statusTag(role)" effect="light">{{ role === 'teacher' ? '老师' : '学生' }}</el-tag>
            <el-tag type="info" effect="plain">{{ gradeLabel(profile.grade) }}</el-tag>
            <span class="credit-pill">信用 {{ profile.credit }}</span>
          </div>
          <div class="muted">{{ profile.description || '暂无简介' }}</div>
          <div class="muted">账号：{{ profile.phone }}</div>
        </div>
      </div>
    </el-card>

    <el-card v-if="profile" shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="个人资料" name="profile">
          <el-descriptions :column="descCols" border>
            <el-descriptions-item :label="role === 'teacher' ? '本人年级' : '年级'">
              {{ gradeLabel(profile.grade) }}
            </el-descriptions-item>
            <el-descriptions-item label="性别">{{ profile.gender ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ profile.age ?? '—' }}</el-descriptions-item>
            <el-descriptions-item :label="role === 'teacher' ? '可授科目' : '需要的科目'">
              {{ subjectsText() }}
            </el-descriptions-item>
            <el-descriptions-item label="所在区域" :span="2">{{ profile.address || '—' }}</el-descriptions-item>
            <el-descriptions-item label="空闲时间" :span="2">{{ timeText() }}</el-descriptions-item>
          </el-descriptions>

          <div class="sec-title">账号信息</div>
          <el-descriptions :column="descCols" border>
            <el-descriptions-item label="用户 ID">{{ id }}</el-descriptions-item>
            <el-descriptions-item label="登录手机号">{{ profile.phone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="账号状态">
              <el-tag :type="statusType(f('status'))" size="small" effect="light">{{ statusText(f('status')) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="信用分">{{ profile.credit }}</el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ f('createdAt') }}</el-descriptions-item>
            <el-descriptions-item label="最近更新">{{ f('updatedAt') }}</el-descriptions-item>
          </el-descriptions>

          <div class="sec-title">资料自述</div>
          <div class="desc-box">{{ profile.description || '（无）' }}</div>

          <div class="sec-title">每日空闲时段（按小时）</div>
          <el-table :data="weeklyDetail()" size="small" border>
            <el-table-column prop="day" label="星期" width="90" />
            <el-table-column label="可授课时段">
              <template #default="{ row }">
                <span v-if="row.slots">{{ slotsText(row.slots) }}</span>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="sec-title">资料图片</div>
          <div class="img-row">
            <div v-for="it in [
              { key: 'idcard', label: '身份证' },
              { key: 'certificate', label: '教师资格证' },
              { key: 'qrcode', label: '收款码' },
            ]" :key="it.key" class="img-cell">
              <el-image
                v-if="img(it.key)"
                :src="img(it.key)!"
                :preview-src-list="[img(it.key)!]"
                preview-teleported
                fit="cover"
                style="width: 120px; height: 120px; border-radius: 8px; border: 1px solid #eef1f6"
              />
              <div v-else class="img-empty">未上传</div>
              <span class="muted">{{ it.label }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`历史订单（${orders.length}）`" name="orders">
          <el-table v-if="orders.length" :data="orders" stripe @row-click="openOrder" style="cursor: pointer">
            <el-table-column label="订单号" width="90">
              <template #default="{ row }">#{{ row.id }}</template>
            </el-table-column>
            <el-table-column :label="otherLabel" min-width="110">
              <template #default="{ row }">
                {{ otherRole === 'student' ? row.studentName : row.teacherName }}
              </template>
            </el-table-column>
            <el-table-column prop="subjectsText" label="科目" min-width="130" />
            <el-table-column label="时薪" width="90">
              <template #default="{ row }">¥{{ row.hourlyWage }}</template>
            </el-table-column>
            <el-table-column label="状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="orderTag(row)" effect="light">{{ row.statusName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="stageName" label="阶段" width="100" />
          </el-table>
          <el-empty v-else description="该用户暂无任何订单" />
        </el-tab-pane>

        <el-tab-pane :label="`缴费与凭证（${archive?.vouchers.length ?? 0}）`" name="fee">
          <el-alert
            v-if="archive"
            type="info"
            :closable="false"
            class="mb-12"
            :title="`该用户共 ${archive.stats.orderTotal} 单（进行中 ${archive.stats.orderActive} / 已结束 ${archive.stats.orderClosed}），累计信息费 ¥${archive.stats.infoFeeTotal}；定金为平台固定 ¥${archive.stats.depositAmount}/方`"
          />
          <el-table v-if="archive?.vouchers.length" :data="archive.vouchers" border size="small">
            <el-table-column label="订单号" width="88">
              <template #default="{ row }">
                <el-button link type="primary" @click="openOrderById(row.orderId)">#{{ row.orderId }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="时薪" width="86">
              <template #default="{ row }">¥{{ row.hourlyWage }}</template>
            </el-table-column>
            <el-table-column label="定金" width="80">
              <template #default>¥{{ archive!.stats.depositAmount }}</template>
            </el-table-column>
            <el-table-column label="信息费" width="90">
              <template #default="{ row }">
                <span v-if="row.infoFee">¥{{ row.infoFee }}</span>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="核验状态" min-width="210">
              <template #default="{ row }">
                <el-tag size="small" :type="verBits(row.verification).tea ? 'success' : 'info'" effect="plain" class="mr-4">教师定金</el-tag>
                <el-tag size="small" :type="verBits(row.verification).stu ? 'success' : 'info'" effect="plain" class="mr-4">学生定金</el-tag>
                <el-tag size="small" :type="verBits(row.verification).info ? 'success' : 'info'" effect="plain">信息费</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="凭证（点击放大）" min-width="240">
              <template #default="{ row }">
                <div class="thumb-row">
                  <el-image
                    v-if="row.depositImgTea"
                    :src="row.depositImgTea"
                    :preview-src-list="[row.depositImgTea]"
                    preview-teleported
                    fit="cover"
                    class="thumb"
                    title="教师定金凭证"
                  />
                  <el-image
                    v-if="row.depositImgStu"
                    :src="row.depositImgStu"
                    :preview-src-list="[row.depositImgStu]"
                    preview-teleported
                    fit="cover"
                    class="thumb"
                    title="学生定金凭证"
                  />
                  <el-image
                    v-if="row.infoFeeImg"
                    :src="row.infoFeeImg"
                    :preview-src-list="[row.infoFeeImg]"
                    preview-teleported
                    fit="cover"
                    class="thumb"
                    title="信息费凭证"
                  />
                  <el-image
                    v-if="row.infoFeeQr"
                    :src="row.infoFeeQr"
                    :preview-src-list="[row.infoFeeQr]"
                    preview-teleported
                    fit="cover"
                    class="thumb"
                    title="平台信息费收款码"
                  />
                  <span v-if="!row.depositImgTea && !row.depositImgStu && !row.infoFeeImg && !row.infoFeeQr" class="muted">暂无凭证</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="该用户暂无缴费记录" />
        </el-tab-pane>

        <el-tab-pane :label="`审核与操作记录（${archive?.logs.length ?? 0}）`" name="logs">
          <el-table v-if="archive?.logs.length" :data="archive.logs" border size="small">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="typeName" label="类型" min-width="140" />
            <el-table-column label="关联对象" min-width="120">
              <template #default="{ row }">
                <span v-if="row.type >= 2">订单 #{{ row.tarId }}</span>
                <span v-else>本人资料</span>
              </template>
            </el-table-column>
            <el-table-column label="摘要" min-width="150">
              <template #default="{ row }">{{ logSummary(row) }}</template>
            </el-table-column>
            <el-table-column label="处理状态" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="isPending(row) ? 'warning' : 'success'" effect="plain">
                  {{ isPending(row) ? '待处理' : '已处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="处理管理员" width="110">
              <template #default="{ row }">{{ row.adminId === -1 ? '—' : '#' + row.adminId }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="时间" min-width="160" />
          </el-table>
          <el-empty v-else description="该用户暂无审核/操作记录" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.ph {
  margin-bottom: 18px;
}
.head {
  display: flex;
  gap: 16px;
  align-items: center;
}
.avatar {
  width: 58px;
  height: 58px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #5aa2ff, #2f7cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}
.info {
  min-width: 0;
}
.line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.line1 b {
  font-size: 17px;
}
.muted {
  font-size: 13px;
  color: #606266;
}
.sec-title {
  margin: 16px 0 8px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.desc-box {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  background: #fafbfe;
  border: 1px solid #eef1f6;
  border-radius: 8px;
  padding: 10px 12px;
  white-space: pre-wrap;
}
.img-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.img-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.img-empty {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
}
.thumb-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid #eef1f6;
}
.mr-4 {
  margin-right: 4px;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>