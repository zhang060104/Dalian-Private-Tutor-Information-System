<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref<FormInstance>()
const form = reactive({ account: '', password: '' })

async function submit() {
  await formRef.value?.validate()
  try {
    // 走独立的管理员认证通道（loginAdmin），不复用门户的学生/教师登录
    await auth.loginAdmin(form.account, form.password)
    ElMessage.success('欢迎回来')
    router.push((route.query.redirect as string) || '/admin/dashboard')
  } catch (e) {
    ElMessage.error((e as Error).message || '登录失败')
  }
}
</script>

<template>
  <div class="wrap">
    <el-card class="card" shadow="never">
      <div class="brand">家教中心 · 管理后台</div>
      <div class="sub muted">仅限平台管理员使用</div>
      <el-form ref="formRef" :model="form" label-position="top" size="large">
        <el-form-item label="账号" prop="account" :rules="[{ required: true, message: '请输入账号', trigger: 'blur' }]">
          <el-input v-model="form.account" placeholder="管理员账号 / 手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" :rules="[{ required: true, message: '请输入密码', trigger: 'blur' }]">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" size="large" class="btn" :loading="auth.loading" @click="submit">登 录</el-button>
      </el-form>
      <el-alert type="info" :closable="false" class="tip">
        超管 <b>13800000000</b> / <b>123456</b>　·　运营 <b>13800000009</b> / <b>123456</b>
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f3f9;
  padding: 20px;
}
.card {
  width: 380px;
  border-radius: 14px;
}
.brand {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}
.sub {
  text-align: center;
  font-size: 12px;
  margin: 6px 0 20px;
}
.btn {
  width: 100%;
}
.tip {
  margin-top: 16px;
}
</style>
