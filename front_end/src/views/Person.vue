<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Profile, Role, WeekTimeTables } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { getPerson } from '@/api/users'
import { createOrder } from '@/api/orders'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects, SUBJECTS } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const role = (route.params.role as string) as 'student' | 'teacher'
const id = Number(route.params.id)

const meRole = computed(() => auth.role as 'student' | 'teacher' | null)
const profile = ref<Profile | null>(null)
const loading = ref(true)

// 我是否就是浏览对象（本人 → 跳转 /me 展示订单）
const isSelf = computed(() => !!profile.value && profile.value.isSelf)

const canResume = computed(() => meRole.value === 'teacher' && role === 'student' && !isSelf.value)
const canTrial = computed(() => meRole.value === 'student' && role === 'teacher' && !isSelf.value)

// 发起匹配弹窗
const dlg = ref(false)
const form = reactive({ subject: undefined as number | undefined, hourlyWage: 100, timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables })
const captchaOk = ref(false)
const submitting = ref(false)

function openDialog() {
  captchaOk.value = false
  form.timeTables = [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables
  dlg.value = true
}
async function submitMatch() {
  if (form.subject === undefined) return ElMessage.warning('请选择匹配科目')
  if (!meRole.value) return
  submitting.value = true
  try {
    await createOrder(canResume.value ? 'resume' : 'trial', meRole.value, auth.userId!, id, form.subject, form.hourlyWage)
    ElMessage.success(canResume.value ? '简历已投递' : '免费试课邀请已发起')
    dlg.value = false
    router.push('/orders')
  } catch (e) {
    ElMessage.error((e as Error).message || '发起失败')
  } finally {
    submitting.value = false
  }
}

function subjectsText(): string {
  return profile.value ? decodeSubjects(profile.value.subject).join('、') : ''
}
function timeText(): string {
  const s = timetableSummary(profile.value?.timeTables ?? [0, 0, 0, 0, 0, 0, 0])
  if (!s.length) return '时间待定'
  return s.map((d) => `${d.day} ${d.slots.join(' ')}`).join('\n')
}

onMounted(async () => {
  try {
    profile.value = await getPerson(role, id, auth.role, auth.userId)
    if (profile.value.isSelf) router.replace('/me')
  } catch {
    ElMessage.error('加载失败，用户可能不存在')
    router.replace('/directory')
  } finally {
    loading.value = false
  }
})

function back() {
  router.back()
}
</script>

<template>
  <div class="page" v-loading="loading">
    <el-page-header class="ph" @back="back"><template #content>个人主页</template></el-page-header>

    <template v-if="profile">
      <el-card shadow="never" class="person">
        <div class="head">
          <div class="avatar">{{ profile.nickname.charAt(0) }}</div>
          <div class="info">
            <div class="name-row">
              <b>{{ profile.nickname }}</b>
              <el-tag :type="profile.role === 'teacher' ? 'primary' : 'success'" effect="light">
                {{ profile.role === 'teacher' ? '老师' : '学生' }}
              </el-tag>
              <el-tag type="info" effect="plain">{{ gradeLabel(profile.grade) }}</el-tag>
              <span class="credit-pill">信用 {{ profile.credit }}</span>
            </div>
            <div class="meta muted">
              <span v-if="profile.age">年龄 {{ profile.age }}</span>
              <span v-if="profile.gender">{{ profile.gender }}</span>
              <span v-if="profile.address">· {{ profile.address }}</span>
            </div>
            <div class="subj">
              <span class="muted">{{ profile.role === 'teacher' ? '可授科目：' : '需要辅导：' }}</span>
              <el-tag v-for="s in subjectsText().split('、')" v-show="s" :key="s" size="small" effect="plain" type="success">{{ s }}</el-tag>
            </div>
          </div>
        </div>

        <el-descriptions :column="1" border class="desc">
          <el-descriptions-item label="个人简介">
            <pre class="desc-pre">{{ profile.description || '暂无简介' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="空闲时间">
            <pre class="time-pre">{{ timeText() }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="所在区域">{{ profile.address || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="canResume || canTrial" class="actions">
          <el-button type="primary" size="large" round @click="openDialog">
            {{ canResume ? '投递简历' : '免费试课' }}
          </el-button>
          <span class="muted">首节课免费试听，满意再续</span>
        </div>
        <div v-else-if="!isSelf && meRole === profile.role" class="self-notice">
          <el-alert type="info" :closable="false" title="您与学生/老师同属一类，无法发起匹配" />
        </div>
      </el-card>
    </template>

    <!-- 发起匹配弹窗 -->
    <el-dialog v-model="dlg" :title="canResume ? '投递简历' : '免费试课'" width="640px">
      <el-form label-position="top">
        <el-form-item :label="'匹配科目（' + profile?.nickname + ' 所需/可授）'">
          <el-select v-model="form.subject" placeholder="选择科目" style="width: 100%">
            <el-option v-for="(s, i) in SUBJECTS" :key="s" :label="s" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="授课时薪（元/小时）">
          <el-input-number v-model="form.hourlyWage" :min="30" :step="10" style="width: 200px" />
        </el-form-item>
        <el-form-item label="可授课时段（双方时间需匹配）">
          <ScheduleEditor v-model="form.timeTables" />
        </el-form-item>
        <el-form-item label="安全验证">
          <SliderCaptcha @success="captchaOk = true" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" :disabled="!captchaOk" :loading="submitting" @click="submitMatch">
          确认{{ canResume ? '投递' : '发起试课' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ph {
  margin-bottom: 18px;
}
.person {
  border-radius: 14px;
}
.head {
  display: flex;
  gap: 18px;
  margin-bottom: 18px;
}
.avatar {
  width: 68px;
  height: 68px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #5aa2ff, #2f7cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.name-row b {
  font-size: 20px;
  color: #1d2740;
}
.meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.subj {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.desc-pre {
  font-family: inherit;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.7;
}
.time-pre {
  font-family: inherit;
  white-space: pre-line;
  margin: 0;
  line-height: 1.8;
}
.actions {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.self-notice {
  margin-top: 20px;
}
</style>
