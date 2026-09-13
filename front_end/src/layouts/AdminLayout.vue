<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Menu } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAdminTodo } from '@/composables/useAdminTodo'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** 手机端侧边栏抽屉开关 */
const menuOpen = ref(false)

const isLoginPage = computed(() => route.name === 'admin-login')
const isAdmin = computed(() => auth.role === 'admin')

const menus = [
  { path: '/admin/dashboard', label: '后台概览' },
  { path: '/admin/orders', label: '全部订单' },
  { path: '/admin/users', label: '注册与资料审核' },
  { path: '/admin/payments', label: '缴费核验' },
  { path: '/admin/arbitrations', label: '毁约仲裁' },
  { path: '/admin/credit', label: '信用分管理' },
  { path: '/admin/admins', label: '管理员管理' },
]

// ---------- 待办红标：数据来自 useAdminTodo（轮询只在待办概览页跑） ----------
const { counts: todoCounts, refreshTodo } = useAdminTodo()

/** 路径 -> 待处理数量；>0 的栏目侧栏标红（红底白字） */
const alertCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  if (todoCounts.value.user > 0) m['/admin/users'] = todoCounts.value.user
  if (todoCounts.value.payment > 0) m['/admin/payments'] = todoCounts.value.payment
  if (todoCounts.value.arbit > 0) m['/admin/arbitrations'] = todoCounts.value.arbit
  return m
})

/**
 * 后台页面间跳转时静默校正一次待办计数：
 * 轮询只在待办概览页进行，但审核/核验/仲裁页处理完待办后，
 * 侧栏红标要能跟着消失，所以每次切页补一次静默查询（非轮询，失败不弹提示）。
 */
watch(
  () => route.path,
  (p) => {
    if (p === '/admin' || p === '/admin/dashboard') return
    void refreshTodo()
  },
)

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
        <router-link
          v-for="m in menus"
          :key="m.path"
          :to="m.path"
          class="menu-item"
          :class="{ active: route.path === m.path, alert: (alertCounts[m.path] || 0) > 0 }"
        >
          {{ m.label }}
          <span v-if="alertCounts[m.path]" class="menu-badge">{{ alertCounts[m.path] }}</span>
        </router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="top">
        <button class="burger" type="button" aria-label="打开菜单" @click="menuOpen = true">
          <el-icon><Menu /></el-icon>
        </button>
        <span class="muted top-tip">管理后台 · 不对公众开放入口</span>
        <div class="top-right">
          <span v-if="isAdmin" class="who">{{ auth.nickname }}</span>
          <el-button size="small" text @click="logout">退出登录</el-button>
        </div>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>

    <!-- 手机端侧边栏抽屉 -->
    <el-drawer v-model="menuOpen" direction="ltr" size="72%" :with-header="false">
      <div class="drawer">
        <div class="drawer-brand">家教中心后台</div>
        <nav class="drawer-menu">
          <router-link
            v-for="m in menus"
            :key="m.path"
            :to="m.path"
            class="drawer-item"
            :class="{ active: route.path === m.path, alert: (alertCounts[m.path] || 0) > 0 }"
            @click="menuOpen = false"
          >
            {{ m.label }}
            <span v-if="alertCounts[m.path]" class="menu-badge">{{ alertCounts[m.path] }}</span>
          </router-link>
        </nav>
        <div class="drawer-foot">
          <span class="muted">{{ auth.nickname }}</span>
          <el-button size="small" plain @click="logout">退出登录</el-button>
        </div>
      </div>
    </el-drawer>
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
/* ---------- 待处理红标：红底白字（需覆盖 active/hover） ---------- */
.menu-item.alert,
.menu-item.alert:hover {
  background: #e63946;
  color: #fff;
  font-weight: 600;
}
.menu-item.alert.active {
  background: #c1121f;
  color: #fff;
  border-left-color: #fff;
}
.menu-badge {
  display: inline-block;
  min-width: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 9px;
  background: #fff;
  color: #e63946;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  text-align: center;
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
  flex: none;
}

/* ---------- 抽屉菜单（浅色主题） ---------- */
.drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.drawer-brand {
  font-weight: 600;
  font-size: 15px;
  color: #1d2740;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef1f6;
  margin-bottom: 10px;
}
.drawer-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drawer-item {
  display: block;
  padding: 12px 14px;
  border-radius: 10px;
  color: #4a5468;
  font-size: 15px;
}
.drawer-item.active {
  background: #eaf2ff;
  color: #2f7cf6;
  font-weight: 500;
}
/* ---------- 抽屉待处理红标 ---------- */
.drawer-item.alert {
  background: #e63946;
  color: #fff;
  font-weight: 600;
}
.drawer-item.alert.active {
  background: #c1121f;
  color: #fff;
}
.drawer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #eef1f6;
}

/* ---------- 手机 / 平板（≤900px）：侧边栏收起为抽屉 ---------- */
@media (max-width: 900px) {
  .side {
    display: none;
  }
  .burger {
    display: inline-flex;
  }
  .top {
    height: 52px;
    padding: 0 12px;
    gap: 10px;
  }
  .top-tip {
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .content {
    padding: 14px 12px 32px;
  }
}

@media (max-width: 480px) {
  .top-tip {
    display: none;
  }
  .top-right {
    margin-left: auto;
  }
}
</style>
