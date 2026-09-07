<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, ChatDotRound, SwitchButton } from '@element-plus/icons-vue'
import { CENTER_CONTACT } from '@/types'
import { useSystemStore } from '@/stores/system'

const route = useRoute()
const router = useRouter()
const store = useSystemStore()

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/tutors', label: '教员库' },
  { path: '/about', label: '关于中心' },
  { path: '/contact', label: '找家教' },
] as const

const activePath = computed(() => route.path)
const mobileMenuOpen = ref(false)

/** 顶栏登录态（管理员不展示门户入口，其后台为独立 /admin） */
const loggedIn = computed(() => !!store.current)
const roleHomePath = computed(() => {
  const role = store.current?.role
  if (role === 'teacher') return '/teacher/home'
  if (role === 'student') return '/student/home'
  return ''
})

function logout() {
  store.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<template>
  <div class="portal">
    <!-- 顶栏 -->
    <header class="header">
      <div class="container header-inner">
        <router-link to="/" class="logo" @click="mobileMenuOpen = false">
          <img src="/logo.png" alt="大连私人家教中心" class="logo-mark-img" />
          <span class="logo-text">大连私人家教中心</span>
        </router-link>

        <nav class="nav">
          <router-link
            v-for="item in NAV_ITEMS"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path)) }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="header-actions">
          <a :href="`tel:${CENTER_CONTACT.phone}`" class="header-phone">
            <el-icon><Phone /></el-icon>
            <span>{{ CENTER_CONTACT.phone }}</span>
          </a>

          <!-- 登录态区域 -->
          <template v-if="loggedIn && store.current">
            <span class="header-user">{{ store.current?.name }}</span>
            <el-tag size="small" effect="plain" round>{{ store.roleLabel }}</el-tag>
            <router-link v-if="roleHomePath" :to="roleHomePath" class="header-mypanel">我的面板</router-link>
            <button class="header-logout" type="button" title="退出登录" @click="logout">
              <el-icon><SwitchButton /></el-icon>
            </button>
          </template>
          <router-link v-else to="/login" class="header-login">登录 / 入驻</router-link>

          <router-link to="/contact" class="cta-btn">免费预约试听</router-link>
          <button class="menu-toggle" aria-label="菜单" @click="mobileMenuOpen = !mobileMenuOpen">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- 移动端菜单 -->
      <div v-if="mobileMenuOpen" class="mobile-menu">
        <router-link
          v-for="item in NAV_ITEMS"
          :key="item.path"
          :to="item.path"
          class="mobile-link"
          @click="mobileMenuOpen = false"
        >
          {{ item.label }}
        </router-link>
        <template v-if="loggedIn && store.current">
          <router-link v-if="roleHomePath" :to="roleHomePath" class="mobile-link" @click="mobileMenuOpen = false">
            我的面板（{{ store.current?.name }} · {{ store.roleLabel }}）
          </router-link>
        </template>
        <router-link v-else to="/login" class="mobile-link" @click="mobileMenuOpen = false">登录 / 入驻</router-link>
      </div>
    </header>

    <!-- 页面主体 -->
    <main class="main">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container footer-grid">
        <div class="footer-col footer-brand">
          <div class="footer-logo">大连私人家教中心</div>
          <p class="footer-slogan">{{ CENTER_CONTACT.slogan }}</p>
          <p class="footer-desc">
            专注大连本地一对一/小班家教服务，覆盖小学至高中全科目，
            从源头严选师资，让每一次辅导都有效果。
          </p>
        </div>

        <div class="footer-col">
          <div class="footer-title">快速导航</div>
          <router-link v-for="item in NAV_ITEMS" :key="item.path" :to="item.path" class="footer-link">
            {{ item.label }}
          </router-link>
        </div>

        <div class="footer-col">
          <div class="footer-title">服务承诺</div>
          <ul class="footer-list">
            <li>师资三审：学历 / 经验 / 试讲</li>
            <li>不满意可随时更换教员</li>
            <li>按次付费，无隐形收费</li>
            <li>全程跟踪学习效果</li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="footer-title">联系我们</div>
          <div class="footer-contact">
            <a :href="`tel:${CENTER_CONTACT.phone}`">
              <el-icon><Phone /></el-icon>{{ CENTER_CONTACT.phone }}
            </a>
            <span><el-icon><ChatDotRound /></el-icon>{{ CENTER_CONTACT.serviceTime }}</span>
            <span>{{ CENTER_CONTACT.address }}</span>
          </div>
        </div>
      </div>
      <div class="container footer-bottom">
        © {{ new Date().getFullYear() }} {{ CENTER_CONTACT.name }} · 让每个孩子都遇见好老师
      </div>
    </footer>
  </div>
</template>

<style scoped>
.portal {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ---------- 顶栏 ---------- */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: var(--header-height);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-mark-img {
  height: 36px;
  width: auto;
  display: block;
}

.logo-text {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 15px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--brand-color);
  background: var(--brand-color-light);
}

.nav-link.active {
  color: var(--brand-color);
  background: var(--brand-color-light);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-phone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--brand-color-dark);
  font-size: 15px;
}

.cta-btn {
  background: var(--brand-gradient);
  color: #fff;
  font-size: 14.5px;
  font-weight: 600;
  padding: 9px 20px;
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(47, 124, 246, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(47, 124, 246, 0.42);
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
}

.menu-toggle span {
  width: 22px;
  height: 2px;
  border-radius: 2px;
  background: var(--text-main);
}

.mobile-menu {
  display: none;
  flex-direction: column;
  padding: 8px 24px 16px;
  border-top: 1px solid var(--border-color);
  background: #fff;
}

.mobile-link {
  padding: 12px 4px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.mobile-link:last-child {
  border-bottom: none;
}

/* ---------- 主体 ---------- */
.main {
  flex: 1;
}

/* ---------- 页脚 ---------- */
.footer {
  background: #17203a;
  color: #c3cbdc;
  margin-top: 0;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.3fr;
  gap: 40px;
  padding-top: 56px;
  padding-bottom: 40px;
}

.footer-logo {
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
}

.footer-slogan {
  color: var(--accent-color);
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 600;
}

.footer-desc {
  font-size: 13.5px;
  line-height: 1.9;
  max-width: 300px;
}

.footer-title {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
}

.footer-link {
  display: block;
  padding: 5px 0;
  font-size: 14px;
  color: #c3cbdc;
}

.footer-link:hover {
  color: #fff;
}

.footer-list {
  list-style: none;
}

.footer-list li {
  padding: 5px 0;
  font-size: 14px;
}

.footer-contact {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
}

.footer-contact a,
.footer-contact span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c3cbdc;
}

.footer-contact a:hover {
  color: #fff;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 18px;
  padding-bottom: 22px;
  font-size: 13px;
  text-align: center;
  color: #8b94ab;
}

@media (max-width: 960px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .nav,
  .header-phone {
    display: none;
  }

  .header-actions {
    margin-left: auto;
  }

  .menu-toggle {
    display: flex;
  }

  .mobile-menu {
    display: flex;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

/* ---------- 顶栏登录态 ---------- */
.header-user {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
}

.header-mypanel {
  font-size: 13px;
  color: var(--brand-color);
  font-weight: 600;
}

.header-mypanel:hover {
  text-decoration: underline;
}

.header-login {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-color);
  border: 1px solid var(--brand-color);
  padding: 6px 14px;
  border-radius: 999px;
  transition: all 0.15s;
}

.header-login:hover {
  background: var(--brand-color);
  color: #fff;
}

.header-logout {
  border: none;
  background: var(--bg-sunken);
  color: var(--text-secondary);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.header-logout:hover {
  background: #fde8e8;
  color: var(--danger-color);
}

@media (max-width: 900px) {
  .header-user,
  .header-mypanel,
  .header-login,
  .header-logout {
    display: none;
  }
}
</style>
