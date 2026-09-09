<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isLoginPage = computed(() => route.name === 'admin-login')
const isAdmin = computed(() => auth.role === 'admin')

const menus = [
  { path: '/admin/dashboard', label: '后台概览' },
  { path: '/admin/users', label: '注册与资料审核' },
  { path: '/admin/payments', label: '缴费核验' },
  { path: '/admin/arbitrations', label: '毁约仲裁' },
  { path: '/admin/credit', label: '信用分管理' },
  { path: '/admin/admins', label: '管理员管理' },
]

async function logout() {
  await auth.logout()
  ElMessage.success('已退出')
  router.push('/admin')
}
</script>

<template>
  <div v-if="isLoginPage" class="admin-solo">
    <router-view />
  </div>
  <div v-else class="admin">
    <aside class="side">
      <div class="side-brand">家教中心后台</div>
      <nav class="menu">
        <router-link v-for="m in menus" :key="m.path" :to="m.path" class="menu-item" :class="{ active: route.path === m.path }">
          {{ m.label }}
        </router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="top">
        <span class="muted">管理后台 · 不对公众开放入口</span>
        <div class="top-right">
          <span v-if="isAdmin" class="who">{{ auth.nickname }}</span>
          <el-button size="small" text @click="logout">退出登录</el-button>
        </div>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-solo {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f3f9;
}
.admin {
  display: flex;
  min-height: 100vh;
}
.side {
  width: 210px;
  background: #243044;
  color: #c8d2e0;
  padding: 20px 0;
  flex: none;
}
.side-brand {
  padding: 0 20px 18px;
  font-weight: 600;
  font-size: 15px;
  color: #fff;
  border-bottom: 1px solid #35415a;
  margin-bottom: 12px;
}
.menu-item {
  display: block;
  padding: 11px 20px;
  color: #c8d2e0;
  font-size: 14px;
  border-left: 3px solid transparent;
}
.menu-item:hover {
  background: #2d3a53;
  color: #fff;
}
.menu-item.active {
  background: #33405c;
  color: #fff;
  border-left-color: #2f7cf6;
  font-weight: 500;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.top {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #eef1f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.who {
  font-size: 13px;
  color: #606266;
}
.content {
  flex: 1;
  padding: 24px;
}
</style>
