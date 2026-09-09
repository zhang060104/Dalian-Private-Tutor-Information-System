<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Profile, RegisterPayload } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { listPendingRequests, approveUserRequest, rejectUserRequest, type RequestView } from '@/api/admin'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects, SUBJECTS } from '@/utils/subject'

const auth = useAuthStore()
const items = ref<RequestView[]>([])
const kindMap = { register: '注册入驻', 'edit-profile': '资料修改' } as const

function refresh() {
  items.value = listPendingRequests().filter((i) => i.kind === 'register' || i.kind === 'edit-profile')
}
onMounted(refresh)

type UserReq = RequestView & { kind: 'register' | 'edit-profile' }
const userItems = (): UserReq[] => items.value as UserReq[]

// payload 解码展示
function payloadLines(r: UserReq): { k: string; v: string }[] {
  const p = r.payload as RegisterPayload
  const out: { k: string; v: string }[] = [
    { k: '昵称', v: p.nickname },
    { k: '手机号', v: p.phone },
    { k: '性别', v: p.gender ?? '—' },
    { k: '年龄', v: String(p.age ?? '—') },
    { k: '年级', v: gradeLabel(p.grade ?? 0) },
    { k: '科目', v: decodeSubjects(p.subject ?? 0).join('、') || '—' },
  ]
  if (p.role === 'teacher') out.push({ k: '资质证书', v: p.certificate ? '已上传' : '未上传' })
  out.push({ k: '简介', v: p.description || '—' })
  out.push({ k: '收款码', v: p.QRcode ? '已上传' : '—' })
  out.push({ k: '身份证', v: p.IDcard ? '已上传' : '—' })
  return out
}
function editLines(r: UserReq): { k: string; v: string }[] {
  const patch = (r.payload as { role: string; patch: Partial<Profile> }).patch ?? {}
  const out: { k: string; v: string }[] = []
  if (patch.age != null) out.push({ k: '年龄', v: String(patch.age) })
  if (patch.gender) out.push({ k: '性别', v: patch.gender })
  if (patch.grade != null) out.push({ k: '年级', v: gradeLabel(patch.grade) })
  if (patch.subject != null) out.push({ k: '科目', v: decodeSubjects(patch.subject).join('、') })
  if (patch.description != null) out.push({ k: '简介', v: patch.description })
  if (patch.address != null) out.push({ k: '区域', v: patch.address || '—' })
  return out
}

function approve(r: UserReq) {
  approveUserRequest(r.id, auth.userId!, undefined)
  ElMessage.success('已通过')
  refresh()
}
function reject(r: UserReq) {
  rejectUserRequest(r.id, auth.userId!)
  ElMessage.success('已打回')
  refresh()
}

// 手动修改用户信息（文档业务逻辑 11）
const manualOpen = ref(false)
const manualTarget = ref<UserReq | null>(null)
const manual = reactive({ nickname: '', age: undefined as number | undefined, grade: undefined as number | undefined, subjects: [] as number[], description: '' })
function openManual(r: UserReq) {
  manualTarget.value = r
  const base = r.kind === 'register' ? (r.payload as RegisterPayload) : { nickname: '', grade: 0, subject: 0, description: '' }
  manual.nickname = base.nickname ?? ''
  manual.age = (base as RegisterPayload).age ?? undefined
  manual.grade = base.grade ?? 0
  manual.subjects = decodeSubjects((base as RegisterPayload).subject ?? 0).map((s) => SUBJECTS.indexOf(s)).filter((i) => i >= 0)
  manual.description = base.description ?? ''
  manualOpen.value = true
}
function submitManual() {
  if (!manualTarget.value) return
  let subject = 0
  manual.subjects.forEach((i) => (subject |= 1 << i))
  const patch: Partial<Profile> = { nickname: manual.nickname, age: manual.age, grade: manual.grade, subject, description: manual.description }
  approveUserRequest(manualTarget.value.id, auth.userId!, patch)
  ElMessage.success('已通过并按手动修改的内容生效')
  manualOpen.value = false
  refresh()
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">注册与资料审核</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!userItems().length" description="暂无待审核的注册或资料修改" />
    <el-card v-for="r in userItems()" :key="r.id" shadow="never" class="req">
      <div class="req-head">
        <el-tag type="warning" effect="plain">{{ kindMap[r.kind] }}</el-tag>
        <b>{{ r.summary }}</b>
        <span class="muted">{{ r.createdAt.slice(0, 16).replace('T', ' ') }}</span>
      </div>
      <el-descriptions v-if="r.kind === 'register'" :column="2" size="small" border>
        <el-descriptions-item v-for="l in payloadLines(r)" :key="l.k" :label="l.k">{{ l.v }}</el-descriptions-item>
      </el-descriptions>
      <el-descriptions v-else :column="1" size="small" border>
        <el-descriptions-item v-for="l in editLines(r)" :key="l.k" :label="l.k">{{ l.v }}</el-descriptions-item>
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
        <el-form-item label="年龄"><el-input-number v-model="manual.age" :min="1" :max="99" :controls="false" /></el-form-item>
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
        <el-form-item label="简介"><el-input v-model="manual.description" type="textarea" :rows="3" /></el-form-item>
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
</style>
