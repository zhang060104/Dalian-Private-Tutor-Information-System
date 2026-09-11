# 前端开发日志（DEVLOG）

> 本项目日志只增不删。废弃重建会另起新段落说明，历史保留。

## 2026-09-08 ｜ 前端整体废弃重建（历史业务代码全部移除）

**背景**：旧版前端（Vue3 + Vite + Element Plus + Pinia，含 PortalLayout 门户、match 双选大厅、member 工作台、auth 登录入驻、admin 后台等约 4486 行业务代码）经多轮迭代后遗留问题过多（工程骨架文件丢失、代码与新架构冲突、耦合严重），经决策整体废弃，重建干净脚手架作为新一轮开发的起点。

**本次操作**：
- 删除旧 `front_end` 全部历史文件（src 业务代码 / public 静态资源 / 工程配置），含此前已加入的 Element Plus、axios、样式体系。
- 由 `create-vue` 官方脚手架思路手动重建标准 **Vue 3.5 + Vite 8 + TypeScript 6 + Vue Router + Pinia** 空白工程（create-vue 交互式初始化因环境批量删除保护拦截未能完整落地，改为逐文件落盘，产物等同官方空模板）。
- 当前 `front_end` 仅为可运行空骨架：`/` 一个占位 Home 页，无任何业务逻辑与页面。
- 删除 `back_end/sql/` 下 `schema.sql`、`seed.sql`（数据库构建脚本不再直接存于项目目录，避免后续维护推送成本；数据库 schema 重构待「数据库设计说明文档.md」更新后再落地）。
- 验证：`npm run type-check` 通过；`vite build` 成功（27 modules）；`npm run dev` HTTP 200。
- 后续规划：数据库文档 → 数据库重构 + 后端逻辑重构，前端再按新契约重新开发。
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-09 ｜ 依据《项目设计说明文档.md》重做全部前端页面（mock + 预留 API）
设计文档由用户移至项目根目录（原 back_end 数据库文档）。基于其 5 表结构 + 订单状态机重做前端。

**技术**：Element Plus 2.14.5 + 图标全量注册 + 中文 locale；axios 预装；Vue3.5+Vite8+TS6+Router+Pinia。
URL 平铺：`/directory` `/person/:role/:id` `/me` `/orders` `/order/:id` `/order/:id/edit`；
管理后台独立 `/admin/*`（无门户入口、凭 URL 直达，守卫 role=admin）。

**架构（关键：预留真实 API 空间）**
- `src/types/index.ts`：Profile/Student/Teacher/Order/Admin/RequestLog，严格对齐文档字段。
- `src/utils/`：subject.ts(24科目位掩码) · grade.ts(0-17，教师仅13+) · timetable.ts(7×24位图) ·
  order.ts(状态机0..12 + myActions 权限矩阵)。
- `src/api/`：auth/users/orders/admin/http —— **页面与 store 只调用这些**，当前内部返回 mock，
  每函数标注 `TODO(real): http...`，切真实后端仅改 api 内部。http.ts 为 axios 实例(带 token 拦截)。
- `src/data/mock.ts`(种子库+登录) + `mockApi.ts`(写操作全集)：localStorage 持久化模拟后端，刷新不丢，
  可完整演示注册→审核→匹配→缴费→试课→结单→仲裁全流程。存储用户含顶层 phone 用于登录(mock 内专用类型 StoredUser)。
- `src/stores/auth.ts`：登录态(角色/id/token)持久化；`src/components/`：SliderCaptcha(滑块防刷)、
  ScheduleEditor(7×24 时间点选)；`src/layouts/`：PortalLayout(门户)、AdminLayout(独立后台侧栏)。

**业务功能页（对齐文档）**
- 门户：主页(免费试课广告+三步引导，无内部逻辑)、登录(师/生 tab + 演示账号)、入驻注册(必传昵称/密码/手机/
  收款码/身份证，教师可选资质；滑块；提交管理员审核)。
- 用户端：匹配大厅(Directory 师/生两池 tab+年级/科目/关键字筛选)、对方个人主页(Person：学生→免费试课、
  老师→简历投递，弹窗选科目/时薪/时间表+滑块)、我的主页(Me：纯净资料+进行中订单+本人修改提交审核+
  暂停/恢复寻找)、订单列表(Orders)、订单信息确认独立页(OrderEdit：改单互审 3/4 往复)、订单详情
  (OrderDetail：缴费上传截图→管理员核验、试课通过、结单、授课期毁约仲裁；联系方式缴费核验通过后互见)。
- 管理端：AdminLogin、Dashboard(待办统计)、UserAudit(注册/资料审核，可通过/打回/**手动改后通过**)、
  Payments(定金/信息费截图核验，三笔齐→进入试课)、Arbitrations(毁约仲裁结案+扣信用分)、
  Credit(全用户信用分±调整)、Admins(管理员管理，ID0 不可删、仅超管可建)。

**验证**：`npm run type-check` 全绿；`vite build` 成功(全部路由 chunk 生成)；dev server 各页 200。
**注意**：主 chunk ~872KB 因 Element Plus 全量引入，如需可后续改按需(未做，避免过度)。
- 提交人：Claw 助手 / zhang060104 授权

---

## 2026-09-09 · 前端收尾几轮（登录隔离 / 后台全部订单 / 科目多选 / 语义修正）

**登录隔离**
- 门户登录页删脚注「管理员入口」；后台 `/admin` 无入口、凭 URL 直达。
- 修复守卫 bug：原 admin 区只处理 `meta.admin`(保护页)，漏 `adminPublic`(登录页)，
  未登录访问 `/admin` 被末尾门户规则踢去 `/login`。改为**按路径前缀分流**：`/admin`、`/admin/*`
  一律走独立后台块，与门户跳转规则完全隔离。
- 管理员登录彻底独立：新增 `mock.ts mockAdminLogin`、`api/auth.ts adminLogin`(真实指向
  /auth/admin/login)、`stores/auth.ts loginAdmin` action；`AdminLogin.vue` 用 `auth.loginAdmin`
  + `account` 字段，不再走通用 `auth.login({role:'admin'})`。
- mock 缓存键升 **dl_tutor_mock_v2**（逼旧 localStorage 重播 seed）。

**后台「全部订单」+ 跳转贯通（只读后台族）**
- 侧栏新增「全部订单」→ `/admin/orders`(Orders.vue el-table)；行点跳 `/admin/order/:id` 只读订单详情
  (OrderAdminDetail.vue：双方/科目/时薪/信息费/时间表/缴费核验3位)。状态一律 `orderStatus().name` 中文，
  不露 status 码。
- 毁约仲裁 Arbitrations：订单号改可点链接 + 「查看订单详情」按钮 → 订单详情。
- 信用分 Credit：昵称列 + 「查看」列(个人主页/历史订单) → 新后台用户档案 `/admin/user/:role/:id`
  (UserArchive.vue：el-tabs「个人资料」+「历史订单」，订单行可再进订单详情)。
- `api/admin.ts`：抽 `toAdminRows` 公共映射；新增 `listOrdersForUserAdmin`/`getUserAdmin`/
  `listAllOrders`/`getOrderAdmin`。后台全部用独立只读页，不复用门户 OrderDetail(myActions 面向学生/教师)。

**教师 grade 语义 = 本人学历阶段（勿当"可授年级"）**
- `grade.ts` 注释 + TEACHER_GRADE_LEVELS(13-16大学生/17已毕业)写清；Register/Me 表单 label 改
  「本人年级」，展示区同步；可授科目仍由 subject 表达。
- seed 修正 4 位"在职/退休/研究生/毕业"教师原误当可教年级的 grade(13/15/14/12) → 全 17。

**订单科目单选择多选（位掩码）**
- Person(下单) + OrderEdit(信息确认)：subject:number → subjects:number[]，el-select multiple，
  提交 `encodeSubjects()`、加载 `decodeSubjects→indexOf` 还原。
- ⭐ 顺带修复 Person 下单把"裸科目下标当掩码"的 bug(选 index3 会成 语文+数学)；types Order.subject 注释改多科。

**年龄范围**：注册/我的资料/管理员手动改单三处 el-input-number `:min="1" :max="99"`(>0 且 <100)。

**验证**：`npm run type-check` 全绿；`vite build` 成功；dev 各新模块 200。
- 提交人：Claw 助手 / zhang060104 授权

---

## 2026-09-09 · 后端接口全量接入 + 滑块对接后端 + mock 数据删除

**滑块验证码（对接真实后端）**
- `SliderCaptcha.vue` 完全重写：拉取 `GET /api/captcha`（含 base64 背景图+拼块图），canvas 自动扫描
  背景上白色描边矩形定位缺口垂直 y（CaptchaVO 不返回 y），拖动拼块对齐缺口后 `POST /api/captcha/verify`
  返回 token 持有 5 分钟，组件 `@success(token)` 通知父组件持有 captchaToken。
- 5 处使用点（Register/Me/Person/OrderEdit/OrderDetail×2）改造：组件不再只是布尔放行，token 透传给
  业务请求（注册/资料修改/发起订单/缴费上传/仲裁）。

**http 客户端重写（统一响应拦截）**
- 解包 `{code,message,data}` 信封 → 仅返回 `data`；code≠0 弹 toast 并抛错；401 清 token 并跳转登录页
  （admin 区跳 /admin，门户跳 /login）；ECONNABORTED 超时/5xx 兜底提示。
- vite proxy：`/api → http://localhost:8083`、`/files → 同`（用于后端上传文件直接预览）。

**api 层全部切真实后端**
- `api/auth.ts`：login(role, phone, password) / adminLogin / register(RegisterPayloadDTO 含 timeTable1..7)
- `api/users.ts`：listStudents/listTeachers/getPerson/getMyProfile/setSeeking/requestProfileChange
- `api/orders.ts`：订单全状态机（apply/confirm/reject/cancel/detail/confirm-detail/payment/trial-pass/
  settle/arbitrate）+ listMine + getOrder；DTO → Profile/Order 转换（含 timeTable1..7↔[7]）
- `api/admin.ts`：stats / requests(pending/type) / resolve / listAllOrders / getOrderAdmin / listAdminUsers
  / adjustCredit / uploadInfoFeeQr / admins CRUD（仅超管）

**types 字段命名统一 camelCase**（与后端 MyBatis map-underscore-to-camel-case 对齐）
- Order：hourly_wage → hourlyWage；depositImgTea → teaDepositImg 等；status:0|1 → number
- 删除不再使用的 LoginPayload/LoginResult/RegisterPayload/Student/Teacher/Admin/Profile 子接口

**mock 数据全部删除**
- 删除 `src/data/mock.ts` 与 `src/data/mockApi.ts`（含种子用户/订单/状态机/一键填充演示账号）
- 同步删除 Login.vue 的演示账号一键填充 tag，AdminLogin.vue tip 改为后端 seed 真实账号（超管
  138****0000/******，运营 138****0009/******）

**页面改造**（逐个切真实 API 并串联 captchaToken）
- Login：删除演示一键填充，调 `auth.login(role, phone, password)`
- Register：3 张证件图真实 multipart 上传，调 `auth.register` 带 captchaToken
- Me：资料修改走 `requestProfileChange(role, captchaToken, patch)`，持有 token 后才放行
- Person：发起匹配走 `createOrder(targetId, captchaToken)`，后端自动带学科/时间交集
- OrderEdit：明细提交带位掩码多科目，submitOrderInfo(oid, patch)
- OrderDetail：缴费 + 仲裁真实 multipart 上传，调对应 API
- Orders：listMyOrders(role, scope)，scope: active|all
- admin/*（Dashboard/Orders/OrderAdminDetail/Payments/Arbitrations/UserAudit/Credit/Admins/UserArchive）：
  全部以 `listRequests/resolveRequest/listAllOrders/getOrderAdmin/getUserAdmin/listAllUsers/...` 真实接入

**后端 seed（演示账号）**
- 学生：139****0001~03；教师：138****0001~03；超管：138****0000；运营：138****0009；密码 ******
- 教师 grade 已全 17（已毕业）以契合"大学生兼职/全职教师"语义

**验证**
- `npm run type-check` 全绿；`npm run build` 成功
- vite proxy + 后端 8083 实测：captcha 200，code=0 返回 data，401/500 弹对应错
- dev server 持续 HMR 工作（task_id jcXN4j 仍跑）

**提交人**：Claw 助手 / zhang060104 授权
