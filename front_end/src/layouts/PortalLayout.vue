<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Menu } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** 手机端抽屉菜单开关 */
const menuOpen = ref(false)

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
  menuOpen.value = false
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
          <!-- 手机端菜单按钮（桌面端隐藏） -->
          <button class="burger" type="button" aria-label="打开菜单" @click="menuOpen = true">
            <el-icon><Menu /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <!-- 手机端导航抽屉 -->
    <el-drawer v-model="menuOpen" direction="rtl" size="76%" :with-header="false">
      <div class="drawer">
        <div class="drawer-head">
          <img src="/imgs/logo.jpg" alt="logo" class="logo" />
          <span class="brand-text">大连私人家教平台</span>
        </div>
        <nav class="drawer-nav">
          <router-link
            v-for="n in navs"
            :key="n.path"
            :to="n.path"
            class="drawer-link"
            :class="{ active: active(n.path) }"
            @click="menuOpen = false"
          >
            {{ n.label }}
          </router-link>
          <template v-if="!loggedIn">
            <router-link to="/login" class="drawer-link" @click="menuOpen = false">登录</router-link>
            <router-link to="/register" class="drawer-link" @click="menuOpen = false">免费入驻</router-link>
          </template>
        </nav>
        <div v-if="loggedIn" class="drawer-foot">
          <span class="muted">{{ roleName }} · {{ auth.nickname }}</span>
          <el-button size="small" plain @click="logout">退出登录</el-button>
        </div>
      </div>
    </el-drawer>
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

/* ---------- 手机端菜单按钮（桌面隐藏） ---------- */
.burger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  color: #4a5468;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
}
.burger:active {
  background: #f3f7fd;
}

/* ---------- 抽屉菜单 ---------- */
.drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.drawer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #2c3e50;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef1f6;
  margin-bottom: 10px;
}
.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.drawer-link {
  display: block;
  padding: 12px 14px;
  border-radius: 10px;
  color: #4a5468;
  font-size: 15px;
}
.drawer-link.active {
  background: #eaf2ff;
  color: #2f7cf6;
  font-weight: 500;
}
.drawer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #eef1f6;
}

/* ---------- 手机端（≤768px） ---------- */
@media (max-width: 768px) {
  .inner {
    height: 56px;
    padding: 0 12px;
    gap: 10px;
  }
  .nav,
  .who {
    display: none;
  }
  .brand-text {
    font-size: 15px;
  }
  .right {
    margin-left: auto;
    gap: 8px;
  }
  .burger {
    display: inline-flex;
  }
  .footer {
    padding: 14px 12px;
    font-size: 12px;
  }
}

/* 超小屏：只留 logo */
@media (max-width: 400px) {
  .brand-text {
    display: none;
  }
}
</style>
