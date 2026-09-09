<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { DEMO_ACCOUNTS } from '@/data/mock'
import type { Role } from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const role = ref<'student' | 'teacher'>('teacher')
const form = reactive({ phone: '', password: '' })

const rules: FormRules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function submit() {
  await formRef.value?.validate()
  try {
    await auth.login({ role: role.value, phone: form.phone, password: form.password })
    ElMessage.success('登录成功')
    const redirect = route.query.redirect as string | undefined
    router.push(redirect ?? '/directory')
  } catch (e) {
    ElMessage.error((e as Error).message || '登录失败')
  }
}

function fillDemo(r: 'student' | 'teacher') {
  role.value = r
  const a = DEMO_ACCOUNTS.find((x) => x.role === r)
  if (a) {
    form.phone = a.phone
    form.password = a.password
  }
}
</script>

<template>
  <div class="login-wrap">
    <el-card class="card" shadow="never">
      <h2 class="title">登录大连家教中心</h2>
      <el-segmented v-model="role" :options="[{ label: '我是老师', value: 'teacher' }, { label: '我是学生', value: 'student' }]" block class="role-switch" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="submit">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="注册手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <el-button type="primary" size="large" class="submit" :loading="auth.loading" @click="submit">登 录</el-button>
      </el-form>
      <div class="foot">
        <span>还没有账号？<router-link to="/register">立即入驻</router-link></span>
      </div>
      <el-divider><span style="font-size: 12px; color: #a0a8b8">演示账号（点选自动填入）</span></el-divider>
      <div class="demos">
        <el-tag v-for="d in DEMO_ACCOUNTS" :key="d.phone" class="demo" effect="plain" @click="fillDemo(d.role as 'student' | 'teacher')">
          {{ d.label }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 72vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
}
.card {
  width: 400px;
  border-radius: 14px;
}
.title {
  font-size: 20px;
  text-align: center;
  margin-bottom: 18px;
  color: #1d2740;
}
.role-switch {
  margin-bottom: 18px;
}
.submit {
  width: 100%;
}
.foot {
  margin-top: 14px;
  font-size: 13px;
  color: #606266;
}
.demos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.demo {
  cursor: pointer;
}
</style>
