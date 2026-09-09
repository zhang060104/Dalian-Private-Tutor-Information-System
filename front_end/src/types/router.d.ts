import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 门户公开页（无需登录） */
    public?: boolean
    /** 管理后台：需 admin 登录 */
    admin?: boolean
    /** 管理后台登录页（无需登录即可达） */
    adminPublic?: boolean
  }
}
