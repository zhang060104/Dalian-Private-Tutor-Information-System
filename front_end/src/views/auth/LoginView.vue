<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useSystemStore, ROLE_HOME } from '@/stores/system'
import type { Role } from '@/types'

const store = useSystemStore()
const route = useRoute()
const router = useRouter()

/** 公共登录页仅面向老师/学生；管理员登录走独立后台 /admin（门户不设任何入口） */
type PortalRole = Exclude<Role, 'admin'>

const roleTabs: Array<{ role: PortalRole; label: string; icon: string }> = [
  { role: 'teacher', label: '老师登录', icon: 'User' },
  { role: 'student', label: '学生登录', icon: 'Reading' },
]

/** 演示账号（前端演示模式，接入后端后移除） */
const DEMO: Record<PortalRole, { username: string; password: string; tip: string }> = {
  teacher: { username: 'teacher1', password: '123456', tip: '老师（张明 · 数学）' },
  student: { username: 'student1', password: '123456', tip: '学生（王小雨 · 初二）' },
}

const activeRole = ref<PortalRole>('teacher')
const form = reactive({ username: '', password: '' })
const loading = ref(false)

function fillDemo() {
  form.username = DEMO[activeRole.value].username
  form.password = DEMO[activeRole.value].password
}

async function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    store.login(form.username, form.password, activeRole.value)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.replace(redirect.startsWith('/') ? redirect : ROLE_HOME[activeRole.value])
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

function switchRole(role: PortalRole) {
  activeRole.value = role
  form.username = ''
  form.password = ''
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-logo">教</div>
        <h2 class="auth-title">大连私人家教中心 · 登录</h2>
        <p class="auth-sub">老师 / 学生分角色登录</p>
      </div>

      <div class="auth-roles">
        <button
          v-for="tab in roleTabs"
          :key="tab.role"
          type="button"
          class="auth-role"
          :class="{ active: activeRole === tab.role }"
          @click="switchRole(tab.role)"
        >
          <el-icon><component :is="tab.icon" /></el-icon>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <el-form label-position="top" size="large" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" clearable @keyup.enter="submit" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="submit"
          />
        </el-form-item>

        <div class="auth-demo">
          <span class="auth-demo-label">演示账号（{{ DEMO[activeRole].tip }}）</span>
          <el-button text type="primary" size="small" @click="fillDemo">一键填入</el-button>
        </div>

        <el-button class="auth-submit" type="primary" size="large" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div class="auth-foot">
        <span>还没有账号？</span>
        <router-link :to="{ path: '/register', query: { role: activeRole } }">
          老师 / 学生入驻（填写个人信息）
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 56px 16px 72px;
  background:
    radial-gradient(760px 320px at 15% -5%, rgba(47, 124, 246, 0.1), transparent 60%),
    radial-gradient(640px 300px at 90% 0%, rgba(34, 193, 166, 0.1), transparent 55%),
    var(--bg-subtle);
}

.auth-card {
  width: 420px;
  max-width: 100%;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 36px 32px 28px;
  border: 1px solid var(--border-color);
}

.auth-head {
  text-align: center;
  margin-bottom: 22px;
}

.auth-logo {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 16px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.auth-title {
  font-size: 19px;
  color: var(--text-main);
}

.auth-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.auth-roles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.auth-role {
  border: 1px solid var(--border-color);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 10px 4px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}

.auth-role .el-icon {
  font-size: 17px;
}

.auth-role:hover {
  border-color: var(--brand-color);
  color: var(--brand-color);
}

.auth-role.active {
  background: var(--brand-color-light);
  border-color: var(--brand-color);
  color: var(--brand-color-dark);
  font-weight: 600;
}

.auth-demo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 14px;
}

.auth-demo-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.auth-submit {
  width: 100%;
  letter-spacing: 6px;
}

.auth-foot {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.auth-foot a {
  color: var(--brand-color);
  font-weight: 600;
}
</style>
