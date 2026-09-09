<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listRequests, resolveRequest, type RequestDTO } from '@/api/admin'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects, SUBJECTS } from '@/utils/subject'

const items = ref<RequestDTO[]>([])
const loading = ref(true)

// 后端把 requestLog.json 解析为对象：{kind:'register'|'update', name?, fields?:[{label,old,next}], profile:{...}}
interface PayloadVO {
  kind?: string
  name?: string | null
  fields?: { label: string; old?: string | null; next?: string | null }[]
  profile?: Record<string, unknown>
}
function payloadOf(r: RequestDTO): PayloadVO {
  return (r.payload ?? {}) as PayloadVO
}
const profileOf = (r: RequestDTO): Record<string, unknown> => payloadOf(r).profile ?? {}
const kindOf = (r: RequestDTO): 'register' | 'update' =>
  payloadOf(r).kind === 'register' ? 'register' : 'update'

const userItems = computed(() => items.value.filter((i) => i.type === 0 || i.type === 1))

async function refresh() {
  loading.value = true
  try {
    const a = await listRequests({ pending: true, type: 0 })
    const b = await listRequests({ pending: true, type: 1 })
    items.value = [...a, ...b].sort((x, y) => (x.id > y.id ? -1 : 1))
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

/** 展示行：注册/修改携带的完整资料（后端存于 payload.profile 内） */
function fields(r: RequestDTO): { k: string; v: string }[] {
  const p = profileOf(r)
  const out: { k: string; v: string }[] = []
  out.push({ k: '昵称', v: String(p.nickname ?? '—') })
  out.push({ k: '手机号', v: String(p.phone ?? (r.targetPhone ?? '—')) })
  out.push({ k: '性别', v: String(p.gender ?? '—') })
  out.push({ k: '年龄', v: String(p.age ?? '—') })
  if (p.grade != null) out.push({ k: '年级', v: gradeLabel(Number(p.grade)) })
  if (p.subject != null) out.push({ k: '科目', v: decodeSubjects(Number(p.subject)).join('、') || '—' })
  if (p.description) out.push({ k: '简介', v: String(p.description) })
  if (p.address) out.push({ k: '所在区域', v: String(p.address) })
  return out
}

/** 本次申请逐字段改动（后端 fields:[{label,old,next}]），仅资料修改有 */
function patchFields(r: RequestDTO): { label: string; old: string; next: string }[] {
  return (payloadOf(r).fields ?? []).map((f) => ({
    label: f.label || '字段',
    old: f.old ?? '—',
    next: f.next ?? '—',
  }))
}

/** 需展示的证件图（都在 profile 内）：收款码/身份证（两类都有），证书（仅教师） */
function profileImages(r: RequestDTO): { label: string; url: string }[] {
  const p = profileOf(r)
  const arr: { label: string; url: string }[] = []
  const push = (label: string, v: unknown) => {
    if (typeof v === 'string' && v) arr.push({ label, url: v })
  }
  push(r.type === 0 ? '收款码' : '收款码', p.qrcode)
  push('身份证', p.idcard)
  if (r.type === 0) push('资质证书', p.certificate)
  return arr
}

async function approve(r: RequestDTO) {
  await resolveRequest(r.id, { approve: true })
  ElMessage.success(kindOf(r) === 'register' ? '已通过，账号已激活' : '已通过，资料已合并')
  refresh()
}
async function reject(r: RequestDTO) {
  await resolveRequest(r.id, { approve: false })
  ElMessage.success('已打回')
  refresh()
}

// 手动修改后通过（后端仅 kind=update 合并 override profile；register 走原资料激活，故隐藏该入口）
const manualOpen = ref(false)
const manualTarget = ref<RequestDTO | null>(null)
const manual = reactive({
  nickname: '',
  age: undefined as number | undefined,
  grade: undefined as number | undefined,
  subjects: [] as number[],
  description: '',
})
function openManual(r: RequestDTO) {
  manualTarget.value = r
  const p = profileOf(r)
  manual.nickname = String(p.nickname ?? r.targetName ?? '')
  manual.age = p.age != null ? Number(p.age) : undefined
  manual.grade = p.grade != null ? Number(p.grade) : 0
  manual.subjects =
    p.subject != null
      ? decodeSubjects(Number(p.subject)).map((s) => SUBJECTS.indexOf(s)).filter((i) => i >= 0)
      : []
  manual.description = String(p.description ?? '')
  manualOpen.value = true
}
async function submitManual() {
  if (!manualTarget.value) return
  let subject = 0
  manual.subjects.forEach((i) => (subject |= 1 << i))
  await resolveRequest(manualTarget.value.id, {
    approve: true,
    profile: {
      nickname: manual.nickname,
      age: manual.age,
      grade: manual.grade,
      subject,
      description: manual.description,
    },
  })
  ElMessage.success('已通过并按手动修改的内容生效')
  manualOpen.value = false
  refresh()
}

function timeOf(r: RequestDTO): string {
  return (r.createdAt ?? '').slice(0, 16).replace('T', ' ')
}
</script>

<template>
  <div v-loading="loading">
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">注册与资料审核</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!userItems.length" description="暂无待审核的注册或资料修改" />
    <el-card v-for="r in userItems" :key="r.id" shadow="never" class="req">
      <div class="req-head">
        <el-tag :type="kindOf(r) === 'register' ? 'warning' : 'success'" effect="plain">
          {{ kindOf(r) === 'register' ? '注册入驻' : '资料修改' }}
        </el-tag>
        <el-tag :type="r.type === 0 ? 'primary' : 'info'" effect="plain">{{ r.type === 0 ? '教师' : '学生' }}</el-tag>
        <b>{{ r.targetName || profileOf(r).nickname || `#${r.tarId}` }}</b>
        <span class="muted">{{ timeOf(r) }}</span>
      </div>

      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item v-for="l in fields(r)" :key="l.k" :label="l.k">{{ l.v }}</el-descriptions-item>
      </el-descriptions>

      <!-- 修改项对照（仅资料修改类请求） -->
      <div v-if="patchFields(r).length" class="mt-8">
        <div class="patch-title">本次修改项</div>
        <el-table :data="patchFields(r)" size="small" border class="patch-table">
          <el-table-column prop="label" label="字段" width="130" />
          <el-table-column prop="old" label="原值" min-width="140" />
          <el-table-column prop="next" label="修改为" min-width="140">
            <template #default="{ row }"><b style="color: #2f7cf6">{{ row.next }}</b></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 证件图 -->
      <div v-if="profileImages(r).length" class="imgs mt-8">
        <div v-for="im in profileImages(r)" :key="im.label" class="im">
          <div class="lbl">{{ im.label }}</div>
          <el-image
            :src="im.url"
            :preview-src-list="[im.url]"
            preview-teleported
            fit="contain"
            style="max-width: 130px; max-height: 110px; border: 1px solid #eef1f6; border-radius: 6px"
          />
        </div>
      </div>

      <div class="ops">
        <el-button size="small" type="success" @click="approve(r)">
          {{ kindOf(r) === 'register' ? '通过（激活账号）' : '通过' }}
        </el-button>
        <el-button v-if="kindOf(r) !== 'register'" size="small" type="primary" plain @click="openManual(r)">手动修改后通过</el-button>
        <el-button size="small" type="danger" plain @click="reject(r)">
          {{ kindOf(r) === 'register' ? '打回（保持未激活）' : '打回' }}
        </el-button>
      </div>
    </el-card>

    <el-dialog v-model="manualOpen" title="手动修改用户信息后通过（仅合并以下字段）" width="560px">
      <el-form label-position="top">
        <el-form-item label="昵称"><el-input v-model="manual.nickname" /></el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="manual.age" :min="1" :max="99" :controls="false" />
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="manual.grade">
            <el-option v-for="g in 18" :key="g - 1" :label="gradeLabel(g - 1)" :value="g - 1" />
          </el-select>
        </el-form-item>
        <el-form-item label="科目">
          <el-checkbox-group v-model="manual.subjects">
            <el-checkbox v-for="(s, i) in SUBJECTS" :key="s" :value="i">{{ s }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="manual.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualOpen = false">取消</el-button>
        <el-button type="primary" @click="submitManual">通过并生效</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.req {
  margin-bottom: 14px;
}
.req-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ops {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.mt-8 {
  margin-top: 8px;
}
.patch-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
.imgs {
  display: flex;
  gap: 16px;
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
</style>
