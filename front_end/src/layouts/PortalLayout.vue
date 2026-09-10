<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loggedIn = computed(() => auth.isLoggedIn && auth.role !== 'admin')
const roleName = computed(() => (auth.role === 'teacher' ? '教师' : auth.role === 'student' ? '学生' : ''))

const navs = computed(() => {
  if (!loggedIn.value) return [{ path: '/', label: '首页' }]
  return [
    { path: '/directory', label: '匹配大厅' },
    { path: '/me', label: '我的主页' },
    { path: '/orders', label: '我的订单' },
  ]
})

function active(p: string): boolean {
  if (p === '/') return route.path === '/'
  return route.path.startsWith(p)
}

async function logout() {
  await auth.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<template>
  <div class="portal">
    <header class="topbar">
      <div class="inner">
        <router-link to="/" class="brand">
          <img src="/imgs/logo.jpg" alt="logo" class="logo" />
          <span class="brand-text">大连家教中心</span>
        </router-link>
        <nav class="nav">
          <router-link v-for="n in navs" :key="n.path" :to="n.path" class="nav-link" :class="{ active: active(n.path) }">
            {{ n.label }}
          </router-link>
        </nav>
        <div class="right">
          <template v-if="loggedIn">
            <span class="who">{{ roleName }} · {{ auth.nickname }}</span>
            <el-button size="small" text @click="logout">退出</el-button>
          </template>
          <template v-else>
            <router-link to="/login" class="link-btn">登录</router-link>
            <el-button type="primary" round size="small" @click="router.push('/register')">免费入驻</el-button>
          </template>
        </div>
      </div>
    </header>
    <main class="body">
      <router-view />
    </main>
    <footer class="footer">
      <span>© {{ new Date().getFullYear() }} 大连家教中心 · 让每个孩子都遇见好老师</span>
    </footer>
  </div>
</template>

<style scoped>
.portal {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  background: #fff;
  border-bottom: 1px solid #eef1f6;
  position: sticky;
  top: 0;
  z-index: 20;
}
.inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 28px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 16px;
}
.logo {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  object-fit: cover;
  display: inline-block;
}
.nav {
  display: flex;
  gap: 6px;
  flex: 1;
}
.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  color: #4a5468;
  font-size: 14px;
}
.nav-link:hover {
  background: #f3f7fd;
  color: #2f7cf6;
}
.nav-link.active {
  background: #eaf2ff;
  color: #2f7cf6;
  font-weight: 500;
}
.right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.who {
  font-size: 13px;
  color: #606266;
}
.link-btn {
  color: #2f7cf6;
  font-size: 14px;
}
.body {
  flex: 1;
}
.footer {
  border-top: 1px solid #eef1f6;
  padding: 18px 20px;
  text-align: center;
  color: #a0a8b8;
  font-size: 13px;
}
</style>
