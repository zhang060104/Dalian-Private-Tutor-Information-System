<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useSystemStore, ROLE_HOME } from '@/stores/system'
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/data/tutors'
import type { Role } from '@/types'

/** 老师/学生入驻：注册账号 + 填写个人信息（演示模式，数据存 localStorage） */

const store = useSystemStore()
const route = useRoute()
const router = useRouter()

const role = ref<Role>((route.query.role as Role) === 'student' ? 'student' : 'teacher')

const isTeacher = computed(() => role.value === 'teacher')

const form = reactive({
  username: '',
  password: '',
  confirm: '',
  name: '',
  gender: '男' as '男' | '女',
  phone: '',
  // 老师
  subjects: [] as string[],
  grades: [] as string[],
  years: 1,
  education: '',
  intro: '',
  pricePerHour: 100,
  // 学生
  grade: '',
  subject: '',
  guardian: '',
  note: '',
})

const submitting = ref(false)

function switchRole(r: Role) {
  role.value = r
  router.replace({ path: '/register', query: { role: r } })
}

function validate(): string {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) return '用户名需为 3-20 位字母/数字/下划线'
  if (form.password.length < 6) return '密码至少 6 位'
  if (form.password !== form.confirm) return '两次输入的密码不一致'
  if (!form.name.trim()) return '请填写姓名'
  if (!form.phone.trim()) return '请填写联系电话'
  if (isTeacher.value) {
    if (!form.subjects.length) return '请选择主教科目'
    if (!form.grades.length) return '请选择可教年级'
    if (!form.education.trim()) return '请填写学历背景'
    if (!form.intro.trim()) return '请填写个人简介'
  } else {
    if (!form.grade) return '请选择学生年级'
    if (!form.subject) return '请选择辅导科目'
    if (!form.guardian.trim()) return '请填写家长称呼'
  }
  return ''
}

async function submit() {
  const err = validate()
  if (err) {
    ElMessage.warning(err)
    return
  }
  submitting.value = true
  try {
    if (isTeacher.value) {
      store.registerTeacher({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        subjects: [...form.subjects],
        grades: [...form.grades],
        years: form.years,
        education: form.education.trim(),
        intro: form.intro.trim(),
        pricePerHour: form.pricePerHour,
      })
    } else {
      store.registerStudent({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        grade: form.grade,
        subject: form.subject,
        guardian: form.guardian.trim(),
        note: form.note.trim() || undefined,
      })
    }
    // 入驻成功自动登录进入对应工作台
    store.login(form.username.trim(), form.password, role.value)
    ElMessage.success('入驻成功，欢迎加入大连私人家教中心！')
    router.replace(ROLE_HOME[role.value])
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="reg-page">
    <div class="reg-card">
      <div class="reg-head">
        <h2 class="reg-title">老师 / 学生入驻</h2>
        <p class="reg-sub">注册账号并填写个人信息，提交后自动登录</p>
      </div>

      <div class="reg-roles">
        <button type="button" class="reg-role" :class="{ active: isTeacher }" @click="switchRole('teacher')">
          我是老师 · 入驻授课
        </button>
        <button type="button" class="reg-role" :class="{ active: !isTeacher }" @click="switchRole('student')">
          我是学生 / 家长 · 入驻找家教
        </button>
      </div>

      <el-form label-position="top" size="large" @submit.prevent="submit">
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="用户名（登录账号）" required>
              <el-input v-model="form.username" placeholder="3-20 位字母/数字/下划线" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" required>
              <el-input v-model="form.name" placeholder="真实姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" required>
              <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" required>
              <el-input v-model="form.confirm" type="password" placeholder="再次输入密码" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio-button value="男">男</el-radio-button>
                <el-radio-button value="女">女</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" required>
              <el-input v-model="form.phone" placeholder="手机号 / 座机" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 老师专属资料 ===== -->
        <template v-if="isTeacher">
          <el-form-item label="主教科目（可多选）" required>
            <el-checkbox-group v-model="form.subjects">
              <el-checkbox v-for="s in SUBJECT_OPTIONS" :key="s" :value="s" border>{{ s }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="可教年级（可多选）" required>
            <el-checkbox-group v-model="form.grades">
              <el-checkbox v-for="g in GRADE_OPTIONS" :key="g" :value="g" border>{{ g }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-row :gutter="14">
            <el-col :span="8">
              <el-form-item label="教龄（年）">
                <el-input-number v-model="form.years" :min="0" :max="40" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="课时费（元/小时）">
                <el-input-number v-model="form.pricePerHour" :min="50" :max="1000" :step="10" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="学历背景" required>
                <el-input v-model="form.education" placeholder="如：大连理工大学 本科" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="个人简介（教学经验 / 风格）" required>
            <el-input v-model="form.intro" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="一句话介绍自己，帮助学生了解你" />
          </el-form-item>
        </template>

        <!-- ===== 学生专属资料 ===== -->
        <template v-else>
          <el-row :gutter="14">
            <el-col :span="12">
              <el-form-item label="学生年级" required>
                <el-select v-model="form.grade" placeholder="选择年级" style="width: 100%">
                  <el-option v-for="g in GRADE_OPTIONS" :key="g" :label="g" :value="g" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="需要辅导的科目" required>
                <el-select v-model="form.subject" placeholder="选择科目" style="width: 100%">
                  <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="家长称呼" required>
                <el-input v-model="form.guardian" placeholder="如：王先生 / 李女士" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="补充说明（可选）">
            <el-input v-model="form.note" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="期望上课时间、学习情况等" />
          </el-form-item>
        </template>

        <el-button class="reg-submit" type="primary" size="large" :loading="submitting" @click="submit">
          提交入驻信息
        </el-button>
      </el-form>

      <div class="reg-foot">
        <span>已有账号？</span>
        <router-link to="/login">直接登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reg-page {
  display: flex;
  justify-content: center;
  padding: 44px 16px 72px;
  background:
    radial-gradient(760px 320px at 15% -5%, rgba(47, 124, 246, 0.1), transparent 60%),
    radial-gradient(640px 300px at 90% 0%, rgba(34, 193, 166, 0.1), transparent 55%),
    var(--bg-subtle);
}

.reg-card {
  width: 680px;
  max-width: 100%;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 32px 34px 28px;
  border: 1px solid var(--border-color);
}

.reg-head {
  text-align: center;
  margin-bottom: 18px;
}

.reg-title {
  font-size: 20px;
  color: var(--text-main);
}

.reg-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.reg-roles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 22px;
}

.reg-role {
  border: 1px solid var(--border-color);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.reg-role:hover {
  border-color: var(--brand-color);
  color: var(--brand-color);
}

.reg-role.active {
  background: var(--brand-gradient);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.reg-submit {
  width: 100%;
  letter-spacing: 4px;
  margin-top: 4px;
}

.reg-foot {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.reg-foot a {
  color: var(--brand-color);
  font-weight: 600;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>
