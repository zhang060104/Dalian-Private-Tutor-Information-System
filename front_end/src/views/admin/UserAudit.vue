<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listRequests, resolveRequest, type RequestDTO } from '@/api/admin'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects, SUBJECTS } from '@/utils/subject'

const items = ref<RequestDTO[]>([])
const loading = ref(true)

const userItems = computed(() => items.value.filter((i) => i.type === 0 || i.type === 1))

async function refresh() {
  loading.value = true
  try {
    items.value = await listRequests({ pending: true, type: 0 })
    const more = await listRequests({ pending: true, type: 1 })
    items.value = [...items.value, ...more]
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

function payloadOf(r: RequestDTO) {
  return r.payload as Record<string, unknown>
}
function fields(r: RequestDTO): { k: string; v: string }[] {
  const p = payloadOf(r)
  const out: { k: string; v: string }[] = []
  out.push({ k: '昵称', v: String(p.nickname ?? '—') })
  out.push({ k: '手机号', v: String(p.phone ?? '—') })
  out.push({ k: '性别', v: String(p.gender ?? '—') })
  out.push({ k: '年龄', v: String(p.age ?? '—') })
  if (p.grade != null) out.push({ k: '年级', v: gradeLabel(Number(p.grade)) })
  if (p.subject != null) out.push({ k: '科目', v: decodeSubjects(Number(p.subject)).join('、') || '—' })
  if (p.description) out.push({ k: '简介', v: String(p.description) })
  if (r.type === 0) {
    out.push({ k: '收款码', v: p.qrcode ? '已上传' : '—' })
    out.push({ k: '身份证', v: p.idcard ? '已上传' : '—' })
  }
  return out
}
function patchFields(r: RequestDTO): { k: string; v: string }[] {
  const patch = payloadOf(r).patch as Record<string, unknown> | undefined
  if (!patch) return []
  const out: { k: string; v: string }[] = []
  if (patch.age != null) out.push({ k: '年龄', v: String(patch.age) })
  if (patch.gender) out.push({ k: '性别', v: String(patch.gender) })
  if (patch.grade != null) out.push({ k: '年级', v: gradeLabel(Number(patch.grade)) })
  if (patch.subject != null) out.push({ k: '科目', v: decodeSubjects(Number(patch.subject)).join('、') })
  if (patch.description != null) out.push({ k: '简介', v: String(patch.description) })
  if (patch.address != null) out.push({ k: '区域', v: String(patch.address || '—') })
  return out
}

async function approve(r: RequestDTO) {
  await resolveRequest(r.id, { approve: true })
  ElMessage.success('已通过')
  refresh()
}
async function reject(r: RequestDTO) {
  await resolveRequest(r.id, { approve: false })
  ElMessage.success('已打回')
  refresh()
}

// 手动修改后通过
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
  const p = payloadOf(r)
  manual.nickname = String(p.nickname ?? '')
  manual.age = p.age != null ? Number(p.age) : undefined
  manual.grade = p.grade != null ? Number(p.grade) : 0
  manual.subjects = p.subject != null
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
        <el-tag :type="r.type === 0 ? 'warning' : 'info'" effect="plain">
          {{ r.type === 0 ? '注册入驻' : '资料修改' }}
        </el-tag>
        <b>{{ r.typeName }} #{{ r.id }}</b>
        <span class="muted">{{ timeOf(r) }}</span>
      </div>
      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item v-for="l in fields(r)" :key="l.k" :label="l.k">{{ l.v }}</el-descriptions-item>
      </el-descriptions>
      <el-descriptions
        v-if="r.type === 1 && patchFields(r).length"
        :column="1"
        size="small"
        border
        class="mt-8"
        title="修改项"
      >
        <el-descriptions-item v-for="l in patchFields(r)" :key="l.k" :label="l.k">{{ l.v }}</el-descriptions-item>
      </el-descriptions>
      <div class="ops">
        <el-button size="small" type="success" @click="approve(r)">通过</el-button>
        <el-button size="small" type="primary" plain @click="openManual(r)">手动修改后通过</el-button>
        <el-button size="small" type="danger" plain @click="reject(r)">打回</el-button>
      </div>
    </el-card>

    <el-dialog v-model="manualOpen" title="手动修改用户信息后通过" width="560px">
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
</style>