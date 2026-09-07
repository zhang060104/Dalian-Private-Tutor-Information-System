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

const roleTabs: Array<{ role: PortalRole; label: string; sub: string; icon: string }> = [
  { role: 'teacher', label: '老师登录', sub: '在线开课 · 管理课表', icon: 'User' },
  { role: 'student', label: '学生登录', sub: '找家教 · 约课学习', icon: 'Reading' },
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
    <div class="auth-wrap">
      <!-- ============ 左侧品牌展示区（窄屏自动隐藏） ============ -->
      <aside class="auth-brand">
        <span class="auth-brand-deco deco-a" />
        <span class="auth-brand-deco deco-b" />
        <span class="auth-brand-deco deco-c" />

        <div class="auth-brand-inner">
          <div class="auth-brand-head">
            <img src="/logo.png" alt="大连私人家教中心" class="auth-brand-logo" />
            <span class="auth-brand-name">大连私人家教中心</span>
          </div>

          <h1 class="auth-brand-title">
            好老师，<br />从一次用心的匹配开始
          </h1>
          <p class="auth-brand-desc">
            本地实名师资 · 一对一上门辅导<br />课时计划与学习效果全程留痕
          </p>

          <ul class="auth-brand-points">
            <li>
              <el-icon><component :is="'CircleCheck'" /></el-icon>
              <span>老师实名认证，资料公开可查</span>
            </li>
            <li>
              <el-icon><component :is="'Timer'" /></el-icon>
              <span>空余时间实时可见，即选即约</span>
            </li>
            <li>
              <el-icon><component :is="'ChatDotRound'" /></el-icon>
              <span>课后点评与成长记录清晰可溯</span>
            </li>
          </ul>
        </div>
      </aside>

      <!-- ============ 右侧登录表单区 ============ -->
      <div class="auth-panel">
        <div class="auth-head">
          <h2 class="auth-title">欢迎回来</h2>
          <p class="auth-sub">请选择你的身份并登录账号</p>
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
            <span class="auth-role-icon">
              <el-icon><component :is="tab.icon" /></el-icon>
            </span>
            <span class="auth-role-text">
              <span class="auth-role-label">{{ tab.label }}</span>
              <span class="auth-role-sub">{{ tab.sub }}</span>
            </span>
          </button>
        </div>

        <el-form class="auth-form" size="large" @submit.prevent="submit">
          <el-form-item>
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              clearable
              autocomplete="username"
              @keyup.enter="submit"
            >
              <template #prefix>
                <el-icon><component :is="'User'" /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="current-password"
              @keyup.enter="submit"
            >
              <template #prefix>
                <el-icon><component :is="'Lock'" /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <div class="auth-actions">
            <span class="auth-demo-tip">
              {{ DEMO[activeRole].tip }} · 演示密码 123456
            </span>
            <el-button text type="primary" size="small" @click="fillDemo">一键填入</el-button>
          </div>

          <el-button class="auth-submit" type="primary" size="large" :loading="loading" @click="submit">
            登 录
            <el-icon v-if="!loading" class="auth-submit-arrow"><component :is="'ArrowRight'" /></el-icon>
          </el-button>
        </el-form>

        <div class="auth-foot">
          <span>还没有账号？</span>
          <router-link :to="{ path: '/register', query: { role: activeRole } }">
            立即入驻，成为老师 / 学生
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 48px 16px 76px;
  background:
    radial-gradient(880px 360px at 12% -6%, rgba(47, 124, 246, 0.09), transparent 60%),
    radial-gradient(720px 320px at 95% 4%, rgba(34, 193, 166, 0.1), transparent 55%),
    linear-gradient(180deg, #f8faff 0%, var(--bg-subtle) 100%);
}

/* ---------- 宽版双栏容器 ---------- */
.auth-wrap {
  display: flex;
  width: 940px;
  max-width: 100%;
  min-height: 600px;
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

/* ---------- 左侧品牌区 ---------- */
.auth-brand {
  position: relative;
  flex: 0 0 42%;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.auth-brand-inner {
  position: relative;
  z-index: 2;
  padding: 44px 38px 40px;
  display: flex;
  flex-direction: column;
}

.auth-brand-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.deco-a {
  width: 240px;
  height: 240px;
  right: -70px;
  top: -60px;
}

.deco-b {
  width: 130px;
  height: 130px;
  right: 90px;
  bottom: -50px;
  background: rgba(255, 255, 255, 0.1);
}

.deco-c {
  width: 60px;
  height: 60px;
  left: -18px;
  bottom: 110px;
  background: rgba(255, 255, 255, 0.14);
}

.auth-brand-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 46px;
}

.auth-brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  padding: 4px;
  object-fit: contain;
  box-shadow: 0 6px 16px rgba(15, 60, 150, 0.2);
}

.auth-brand-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.auth-brand-title {
  font-size: 27px;
  line-height: 1.42;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin-bottom: 14px;
}

.auth-brand-desc {
  font-size: 13.5px;
  line-height: 1.85;
  opacity: 0.9;
  margin-bottom: 34px;
}

.auth-brand-points {
  list-style: none;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-brand-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  opacity: 0.96;
}

.auth-brand-points .el-icon {
  font-size: 16px;
  flex: none;
}

/* ---------- 右侧表单区 ---------- */
.auth-panel {
  flex: 1;
  padding: 44px 46px 34px;
  display: flex;
  flex-direction: column;
}

.auth-head {
  text-align: center;
  margin-bottom: 24px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.auth-sub {
  margin-top: 7px;
  font-size: 13.5px;
  color: var(--text-tertiary);
}

/* 角色切换：两块可点大卡 */
.auth-roles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}

.auth-role {
  border: 1px solid var(--border-color);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  transition: all 0.16s ease;
}

.auth-role-icon {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  background: #fff;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.16s ease;
}

.auth-role-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.auth-role-label {
  font-size: 14px;
  font-weight: 600;
}

.auth-role-sub {
  font-size: 11.5px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.auth-role:hover {
  border-color: var(--brand-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.auth-role:hover .auth-role-icon {
  border-color: var(--brand-color);
  color: var(--brand-color);
}

.auth-role.active {
  background: var(--brand-color-light);
  border-color: var(--brand-color);
  box-shadow: 0 0 0 1px var(--brand-color) inset;
}

.auth-role.active .auth-role-icon {
  background: var(--brand-gradient);
  border-color: transparent;
  color: #fff;
}

.auth-role.active .auth-role-label {
  color: var(--brand-color-dark);
}

/* 表单 */
.auth-form .el-form-item {
  margin-bottom: 16px;
}

.auth-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--border-color) inset;
  transition: box-shadow 0.16s ease;
}

.auth-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-color) inset, 0 0 0 3px rgba(47, 124, 246, 0.12);
}

.auth-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 18px;
}

.auth-demo-tip {
  font-size: 12px;
  color: var(--text-tertiary);
}

.auth-submit {
  width: 100%;
  height: 48px;
  font-size: 16px;
  letter-spacing: 8px;
  border-radius: 12px;
  background: var(--brand-gradient);
  border: none;
  transition: opacity 0.2s ease, transform 0.12s ease, box-shadow 0.2s ease;
  box-shadow: 0 8px 20px rgba(47, 124, 246, 0.28);
}

.auth-submit:hover {
  opacity: 0.94;
  box-shadow: 0 10px 24px rgba(47, 124, 246, 0.34);
}

.auth-submit:active {
  transform: translateY(1px);
}

.auth-submit-arrow {
  margin-left: 6px;
  letter-spacing: 0;
  font-size: 15px;
}

/* 底部注册引导 */
.auth-foot {
  margin-top: auto;
  padding-top: 22px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  border-top: 1px dashed var(--border-color);
}

.auth-foot a {
  color: var(--brand-color);
  font-weight: 600;
  margin-left: 2px;
}

.auth-foot a:hover {
  text-decoration: underline;
}

/* ---------- 响应式：窄屏折叠为单栏 ---------- */
@media (max-width: 900px) {
  .auth-page {
    padding: 28px 14px 56px;
  }

  .auth-wrap {
    width: 440px;
    min-height: 0;
  }

  .auth-brand {
    display: none;
  }

  .auth-panel {
    padding: 36px 26px 28px;
  }
}
</style>
