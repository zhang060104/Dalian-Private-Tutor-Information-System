import { createRouter, createWebHistory } from 'vue-router'
import { loadCurrentUser, ROLE_HOME } from '@/stores/system'
import type { Role } from '@/types'

const router = createRouter({
  // history 模式：门户 / 工作台 / 管理后台均为干净路径。
  // 管理后台无任何门户入口，仅靠地址栏手动输入 /admin 直达
  // （部署到静态托管时需将未知路径回退到 index.html，见 README 部署说明）。
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/PortalLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
        { path: 'tutors', name: 'tutors', component: () => import('@/views/TutorsView.vue'), meta: { title: '教员库' } },
        { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue'), meta: { title: '关于中心' } },
        // —— 角色账号体系 ——
        { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { title: '登录' } },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
          meta: { title: '入驻' },
        },
        {
          path: 'teacher/home',
          name: 'teacher-home',
          component: () => import('@/views/member/TeacherHomeView.vue'),
          meta: { title: '老师工作台', role: 'teacher' },
        },
        {
          path: 'student/home',
          name: 'student-home',
          component: () => import('@/views/member/StudentHomeView.vue'),
          meta: { title: '学生空间', role: 'student' },
        },
      ],
    },
    // 独立管理后台：不走门户布局、不挂导航，仅凭 /admin 直达
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminHomeView.vue'),
      meta: { title: '管理后台', role: 'admin' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

function homeOf(role: Role): string {
  return ROLE_HOME[role]
}

router.beforeEach((to) => {
  const need = to.meta.role as Role | undefined
  const cur = loadCurrentUser()

  // 需要角色的页面：
  if (need) {
    if (!cur) {
      // 未登录访问 /admin：放行 —— 管理后台自带登录页，不走公共登录页，
      // 保证"管理员登录窗口"不在门户/公共登录页上出现。
      if (need === 'admin') return true
      // 老师 / 学生页面：去公共登录页，登录后按 redirect 带回
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    // 已登录但角色不符 → 各自的首页
    if (cur.role !== need) return { path: homeOf(cur.role) }
  }

  // 已登录再访问公共登录页 → 去对应首页（管理员回独立后台）
  if (to.name === 'login' && cur) return { path: homeOf(cur.role) }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 大连私人家教中心` : '大连私人家教中心'
})

export default router
