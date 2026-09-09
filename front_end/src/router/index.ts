import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ================= 门户（PortalLayout 承载） =================
    {
      path: '/',
      component: () => import('@/layouts/PortalLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue'), meta: { title: '大连家教中心', public: true } },
        { path: 'login', name: 'login', component: () => import('@/views/Login.vue'), meta: { title: '登录', public: true } },
        { path: 'register', name: 'register', component: () => import('@/views/Register.vue'), meta: { title: '入驻注册', public: true } },
        // —— 登录后的工作台（需 student/teacher）——
        { path: 'directory', name: 'directory', component: () => import('@/views/Directory.vue'), meta: { title: '匹配大厅' } },
        { path: 'person/:role/:id', name: 'person', component: () => import('@/views/Person.vue'), meta: { title: '个人主页' } },
        { path: 'me', name: 'me', component: () => import('@/views/Me.vue'), meta: { title: '我的主页' } },
        { path: 'orders', name: 'orders', component: () => import('@/views/order/Orders.vue'), meta: { title: '我的订单' } },
        { path: 'order/:id', name: 'order-detail', component: () => import('@/views/order/OrderDetail.vue'), meta: { title: '订单详情' } },
        { path: 'order/:id/edit', name: 'order-edit', component: () => import('@/views/order/OrderEdit.vue'), meta: { title: '订单信息确认' } },
      ],
    },
    // ================= 管理后台（独立，无门户入口） =================
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', name: 'admin-login', component: () => import('@/views/admin/AdminLogin.vue'), meta: { title: '管理员登录', adminPublic: true } },
        { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { title: '后台概览', admin: true } },
        { path: 'orders', name: 'admin-orders', component: () => import('@/views/admin/Orders.vue'), meta: { title: '全部订单', admin: true } },
        { path: 'order/:id', name: 'admin-order-detail', component: () => import('@/views/admin/OrderAdminDetail.vue'), meta: { title: '订单详情', admin: true } },
        { path: 'user/:role/:id', name: 'admin-user-archive', component: () => import('@/views/admin/UserArchive.vue'), meta: { title: '用户档案', admin: true } },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UserAudit.vue'), meta: { title: '注册与资料审核', admin: true } },
        { path: 'payments', name: 'admin-payments', component: () => import('@/views/admin/Payments.vue'), meta: { title: '缴费核验', admin: true } },
        { path: 'arbitrations', name: 'admin-arbitrations', component: () => import('@/views/admin/Arbitrations.vue'), meta: { title: '毁约仲裁', admin: true } },
        { path: 'credit', name: 'admin-credit', component: () => import('@/views/admin/Credit.vue'), meta: { title: '信用分管理', admin: true } },
        { path: 'admins', name: 'admin-admins', component: () => import('@/views/admin/Admins.vue'), meta: { title: '管理员管理', admin: true } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

const ADMIN_HOME = '/admin/dashboard'

router.beforeEach((to) => {
  const auth = useAuthStore()
  const cur: Role | null = auth.role
  const isAdminArea = to.path === '/admin' || to.path.startsWith('/admin/')

  // ===== 管理后台区域：独立处理，绝不与门户跳转规则混用 =====
  if (isAdminArea) {
    // 管理员登录页（/admin）对所有人公开放行
    if (to.meta.adminPublic) return true
    // 其余后台子页需 admin 角色
    if (cur === 'admin') return true
    // 已登录的普通用户/游客访问受保护子页：回 /admin 登录页
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  // ===== 门户区域 =====
  // admin 已登录时访问门户页：送回后台
  if (cur === 'admin') return { path: ADMIN_HOME }
  // 门户公开页放行
  if (to.meta.public) {
    // 已登录访问 login/register → 去工作台
    if (cur && (to.name === 'login' || to.name === 'register')) return { name: 'directory' }
    return true
  }
  // 其余门户页（工作台）需登录
  if (!cur) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

router.afterEach((to) => {
  const t = to.meta.title as string | undefined
  document.title = t ? `${t} · 大连家教中心` : '大连家教中心'
})

export default router
