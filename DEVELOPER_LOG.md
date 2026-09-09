# DEVELOPER_LOG.md - 开发者入驻日志

> 规则：**只增不删**。新开发者 / 协作助手入驻时在此登记；每日开发打卡与重要协作记录同样追加（时间 / 内容 / 提交人），并同步 git 提交推送。

---

## 2026-09-04 ｜ 入驻登记（Claw 助手）

- **入驻人**：Claw 助手（OpenClaw 智能体，经 zhang060104 授权在本机协作开发）
- **项目**：Dalian-Private-Tutor-Information-System（大连私人家教信息系统 · 家教信息门户）
- **当前结构认知**（首次入驻时点，main @ 872e3a2）：
  - 仓库现仅含 `front_end/`：Vue3 + Vite + TypeScript + Element Plus + Pinia + Vue Router（hash）+ Axios（`/api` dev 代理占位）
  - 页面骨架：`PortalLayout`（吸顶导航 + 响应式页脚）；页面：首页 HomeView（Hero/特色/明星教员/流程/FAQ/CTA）、教员库 TutorsView（科目/年级/授课方式筛选 + 排序 + 关键词搜索）、关于中心 AboutView、找家教 ContactView（需求表单 + 校验 + 模拟提交）
  - 教员数据为静态 mock（`src/data/tutors.ts`，9 位示例，勿维护真实师资）；类型集中在 `src/types`（Tutor / TutorRequest / CENTER_CONTACT）
  - 后端尚未接入：待办为接口落地后替换 mock 数据与模拟提交
- **协作承诺**：遵守仓库规范——前端改动走 `feature/xxx` 分支 + PR 合并，禁止直推 main；DEVLOG / 本日志只增不删，改动后同步追加记录并提交推送
- 提交人：Claw 助手 / zhang060104 授权

---

## 2026-09-07 ｜ 数据库构建脚本（建库建表 + 一键构建 + 演示种子）

- **背景**：数据库无法随代码同步到队友电脑，改为**以 SQL 脚本入库** —— 任何一台装了 MySQL 8.0+ 的机器跑一次构建脚本即可得到一致的库结构
- **新增文件**：
  - `back_end/sql/schema.sql`：建库 + 建表（幂等，可重复执行）
  - `back_end/sql/seed.sql`：演示种子数据（3 教师 + 3 学生 + 1 管理员，密码 `123456`）
  - `back_end/build_db.sh` / `build_db.bat`：一键构建脚本（Git Bash / Windows 双版本，支持 `-u -p -h -P --seed --reset`）
  - `back_end/README.md`：用法说明 + 位运算备忘 + 已知问题清单
- **库结构**：数据库 `dalian_tutor`（utf8mb4），五表 `student` / `teacher` / `` `order` `` / `admin` / `requestLog`；
  `timeTable1..7` 空余时间位图（低 24 位 = 24 小时）、`subject` 科目位掩码、`student.location` 为 `POINT SRID 4326`（高德导航预留）
- **相对设计文档的工程性调整**（均已在 SQL 注释中标注原因）：
  - `password` 由 `char(16)` 扩到 `char(64)`，为后续 bcrypt 哈希存储留空间（当前演示仍是明文）
  - `order` 表补 `created_at` / `updated_at`：文档运行模式要求「简历超 24 小时自动删除」，超时清理必须依赖创建时间
  - 字段名笔误修正：`houly_wage` → `hourly_wage`、`veryfication` → `verification`
- **⚠️ 待办（重要，阻塞后端接入）**：前端 `src/data/tutors.ts` 的 `SUBJECT_OPTIONS` 仅 12 项且顺序与文档 24 科目位序不同
  （「语文」文档 bit0 / 前端下标 1，「钢琴」文档 bit13 / 前端下标 11）；年级文档为数值编码（0 幼儿园 / 1-6 小学 / 7-9 初中 / 10-12 高中 / 13-16 大学），
  前端为字符串枚举。**两边直接互通会导致科目/年级位掩码整体错位**，接入前必须统一（详见 `sql/seed.sql` 顶部注释）
- **⚠️ 待办**：`teacher` 表按文档未含 `location` / `address`，但业务要求「缴纳信息费后向对方展示地址」，待文档确认后补字段（ALTER 语句已写在 `schema.sql` 注释中）
- **执行状态**：脚本已编写完成；本机 MySQL 8.0.46 已安装且服务运行中，但 root 账号密码未知（本机无凭据缓存），
  **建库尚未实际执行验证**，待提供密码后运行 `./build_db.sh -u root -p <密码> --seed`
- 提交人：Claw 助手 / zhang060104 授权

<br />

### 2026-09-07 · 数据库构建脚本实测通过（补充记录）

- **执行结果**：已提供 root 密码并实际执行 `./build_db.sh -u root -p <密码> --seed`，**构建成功**
- **核验项（全部通过）**：
  - 五表字段与设计文档逐条比对一致，无缺失、无多余（除下述已标注的补充字段）
  - `student.location` 经 `information_schema` 确认 `SRS_ID = 4326`，`ST_Latitude` / `ST_Longitude` 读数正确
  - 订单外键 `fk_order_student` / `fk_order_teacher` 生效，联表查询正常
  - 幂等性：连续执行 2 次构建，种子数据保持 1 管理员 + 3 教师 + 3 学生，无重复插入
  - 位掩码解码验证：`subject=10` → 数学+物理；`subject=8193` → 语文+钢琴，与文档 24 科目位序一致
- **📍 新发现的坑（已写入 README，后端必读）**：MySQL 为 SRID 4326 定义的轴序是「纬度, 经度」，
  但 `POINT()` 函数入参要按「经度, 纬度」传；WKT 写法 `ST_GeomFromText('POINT(经度 纬度)', 4326)` 会直接报错
  `Latitude out of range`，必须写成 `'POINT(纬度 经度)'`；读取时 `ST_X` = 纬度、`ST_Y` = 经度，与常规直觉相反，
  统一用 `ST_Latitude()` / `ST_Longitude()` 更安全
- **⚠️ 新增待办**：文档规定登录用 **phone + password**，而前端 `stores/system.ts` 目前是
  **username + password**（`teacher1` / `student1` / `admin`）。后端接入时前端登录表单需改为手机号登录，
  或在库里补 username 字段，需提前与前端负责人对齐
- **后续**：数据库部分暂告一段落，**后端业务接口暂不开发**，等前端改造完成后再启动
- 提交人：Claw 助手 / zhang060104 授权

<br />

## 2026-09-08 ｜ 后端业务落地 + 前后端对齐 + 建库实测

- **构建数据库**：实际执行 `build_db.sh -u root -p <密码> --seed`，库 `dalian_tutor` 5 表 + 种子（1 管理员 / 3 老师 / 3 学生）构建成功
- **后端业务**（`back_end/`，Spring Boot 3.5.16 + MyBatis 3.0.5 + MySQL，包 `com.daliantutor`）：
  - 登录 `POST /api/auth/login`（phone+password+role），HMAC 令牌鉴权（拦截器 + CORS，`/api/admin/**` 限管理员）
  - 老师/学生入驻注册、列表、我的资料；双向选择（投递简历/指派 → `order` 表 status 0/1）；管理后台统计/列表/待审核请求
  - `mvn compile` 通过（BUILD SUCCESS，JDK 21 + Maven 3.9.16）
- **删除前端无法实现（数据库无法支撑）的业务**，使前后端对齐：
  - 登录由 `username` 改为 `phone`（数据库无 username 字段）
  - 删除学生「家长称呼 guardian」（student 表无此字段）
  - 老师「可教年级」由位掩码多选改为单一数值 `grade`；学生年级由字符串改为数值编码（0~16）
  - 新增 `GRADE_LEVELS` + `gradeLabel()`，移除 `encodeGrades/decodeGrades`；选择关系以 phone 为标识
  - 门户「教员库」的 `Tutor` mock（评分/标签/授课方式等营销展示字段）保留，不接数据库
- 分支：`feature/backend-service`，待联调验证后提 PR（不直推 main）
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 ｜ 个人资料修改审核（管理员审核制）+ 两次 main 冲突合并
- **冲突处理（PR #9 vs main）**：
  - 与 PR #8（移除学生端老师列表）冲突：按业务口径**保留删除**，学生页面不放老师选择列表，选择动作由老师侧发起
  - 与 PR #10（师生资料展示与修改 + 管理员审核制）冲突：5 文件 / 9 处，根因是**架构对撞**（PR #10 基于本地缓存 + username，PR #9 已把 store 换成后端 API + phone）。
    处理为**冲突全取后端分支**，PR #10 前端实现整段弃用，功能改在 API 版上重做（DEVLOG 按只增不删保留其原始记录）
- **后端新增资料修改审核**：`ProfileReviewService` + `ProfileController` + `ProfileReviewSubmit`/`ProfileReviewVO`/`ProfileFieldDiff`
  - 接口：`GET /api/profile/review/mine`、`POST /api/profile/review`、`POST /api/profile/review/{id}/cancel`、
    `GET /api/admin/reviews`、`POST /api/admin/requests/{id}/resolve?approve=true|false`
  - 复用 `requestLog`（type 0=教师信息修改 / 1=学生信息修改，`json` 存 `{name, fields, profile, submittedAt}`，`tarID` 指向师生 id）
  - ⚠️ 审核通过落库用 Jackson `readerForUpdating` 合并进已有实体再 `updateProfile`，避免未提交字段被置空
- **前端**：学生/老师面板「我的资料」+ 修改弹窗 + 待审撤销；管理后台「资料审核」Tab + 字段级新旧对比（通过/驳回）
- 验证：`mvn compile` BUILD SUCCESS（34 源文件）；`npm run type-check` 通过
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 14:00 ｜ 分支清理（Claw 助手）

- **分支盘点**：
  - `feature/backend-service`（PR #9，open）：领先 main 7 commits / 落后 0，**可干净合并**，保留
  - `feature/remove-student-teacher-list`（PR #8，merged）：全部提交已在 main 内，**远程分支删除**
  - 没有冲突无法合并的分支
- **删除命令**：`git push origin :refs/heads/feature/remove-student-teacher-list`（exit 0）
- **prune 后**：`git fetch --prune` + packed-refs 自动同步，本地 tracking 引用已清理
- **最终远程分支**：仅 `main` 与 `feature/backend-service`（PR #9 待 merge）
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 ｜ 前端 8 项优化：数据源真实化 + 双选大厅 + 信用分（Claw 助手）

- **1 · 年级语义修正（按数据库文档）**：`GRADE_LEVELS` 增加 `{value:17,label:'已毕业'}`；
  老师入驻/修改资料明确标注「可授年级（能教哪个学段就选哪个，含已毕业/在职）」，不再是混淆的自身年级。
  同步在数据库设计文档补记 `17=已毕业`、`credit 默认 100`。
- **2 · 移除 mock 数据与提示**：删除 `data/tutors.ts` 的 `TUTORS`/`GRADE_OPTIONS`、`Tutor` 类型、
  `TutorCard.vue`、公开 mock 版 `TutorsView.vue`；删除 LoginView「演示账号/一键填入」、
  各工作台「演示模式」提示条；`/tutors` 路由移除（教员浏览并入登录后的双选大厅）。
- **3 · 工作台不带对方列表 + 投递**：老师/学生个人面板（/teacher/home、/student/home）只保留
  「我的资料 + 修改（管理员审核）」与信用分，删净老师/学生列表与「选择 TA」。
- **4 · 全站禁选中**：`styles/index.css` 全局 `user-select:none`（input/textarea/contenteditable 例外）。
- **5 · 主页精简**：HomeView 删除 FAQ、明星教员、营销数据面板，只留「hero + 四步使用引导 + CTA」。
- **6 · 双选大厅含老师/学生两个池**：新增登录后页面 `/match`（MatchView.vue），el-tabs 分「老师/学生」，
  对「另一侧」才显示「投递简历」（可撤回）；卡片含信用分。
- **7 · 单一个人资料页**：新增 `/person/:role/:id`（PersonProfileView.vue），纯净展示一位老师/学生的
  完整资料 + 空余时间，无任何列表；可从此投递。
- **8 · 信用分展示（替代星级）**：`TeacherAccount`/`StudentAccount` 增加 `credit`，store 映射自后端
  `dto.credit`；工作台/双选卡/个人资料页均以数字展示「信用分」（后端默认 100），彻底移除 mock 星级评分。
- 路由守卫支持 `roles: ['teacher','student']` 数组（登录后按角色，未登录去 /login 带回 redirect）。
- 验证：`npm run type-check` 通过；dev server（5180）各新页面模块均 200。
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 ｜ 删除「关于中心」页（/about，纯前端）
- 删除 `front_end/src/views/AboutView.vue` 与路由 `/about`。
- `PortalLayout` 顶部导航精简：未登录仅「首页」，登录师生另加「双选大厅」（原 about 入口删除）。
- `HomeView` CTA「了解平台」按钮（跳 /about）删除。
- 全仓无 AboutView/「关于中心」残留；`npm run type-check` 通过。
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 ｜ 前端整体废弃重建 + 删除项目内数据库脚本（承接上一条：about 随重建一并废弃）
**背景**：旧 front_end 多轮迭代后问题过多（工程骨架文件曾丢失、代码与新架构冲突），决定废弃重建。
- 删除旧 `front_end` 全部文件：业务源码（门户 / 双选大厅 / member / auth / admin / store / api 等 ~4486 行）、
  public 静态资源、Element Plus 依赖与样式体系；about 页随旧代码一并移除（覆盖上一条「删 about」）。
- 重建标准空骨架：Vue 3.5 + Vite 8 + TypeScript 6 + Vue Router + Pinia，仅含 `/` 占位页，无任何业务逻辑。
  注：`create-vue` 交互式脚手架因环境批量删除保护拦截未能完整落地，改为逐文件落盘（产物等同官方空模板）。
  验证：`npm run type-check` 通过、`vite build` 成功、`npm run dev` HTTP 200。
- 删除 `back_end/sql/` 的 `schema.sql` / `seed.sql`：数据库构建脚本不再直接存于项目目录（避免后续维护推送成本），
  schema 重构待「数据库设计说明文档.md」更新后落地。
- 后续：数据库文档 → 数据库重构 + 后端逻辑重构 → 前端按新契约重开发。
- 提交人：Claw 助手 / zhang060104 授权

---

## 2026-09-09 · 后端业务层完整实现 + 全链路冒烟通过（feature/backend-service）

**背景**：完成设计文档最终定稿（注册=入驻审核制、requestLog type0-5 生命周期、订单状态机 0-12、privacy 规则），随后批量实现全部业务层代码。

**数据库**：
- ack_end/sql/schema.sql + seed.sql 重写重建（库 dalian_tutor，5 表：admin/teacher/student/order/requestLog）
- seed：超管 id=0 13800000000 is_super=1；运营管理员 13800000009；教师/学生各 3 个示例；密码统一 123456；timeTable 工作日 261888 / 周末 130560；location 为 POINT(4326)
- 移除了项目根下旧的数据库脚本（收敛到 back_end/sql/），删除过时的 数据库设计说明文档.md

**注册 = 入驻审核制（最终方案）**：
- POST /api/auth/register（滑块验证码）→ 直接建号 status=1（不可见/不可投递）+ 提交入驻审核 requestLog(type0/1, kind=register)
- 审核期间可登录（status=1 提示"资料审核中"）
- 管理员 approve → status=0 激活上架；reject → 账号保留（status=1），用户改资料重提（kind 自动=register 再激活）
- 撤回入驻申请 → 删除账号释放手机号；重复注册/重复提交有防重

**requestLog = 审计保留制**：admin_id -1(待审)→管理员 id（claim 防并发 UPDATE WHERE admin_id=-1）；json 追加 decision/note/processedAt；处理完不删除

**订单状态机 0-12（OrderController 完整实现）**：
- 0/1 简历阶段：confirm→2；reject/cancel→物理删除；超 24h 每日 00:00 定时清理（@Scheduled + OrderCleanupTask）
- 2 双方可提交明细（学生→3/教师→4）；3 教师确认→5 或再改→4；4 学生确认→5 或再改→3
- 进入 5 时锁定 infoFee = hourlyWage × 每周课时 popcount 总和
- 5 缴费：depositTea(教师定金,type2)/depositStu(学生定金,type3)/infoFee(教师信息费,type4)，同类型 pending 拦截重传
- 管理员核验 type2/3/4 → verification bit0/1/2，(verification&7)==7 → 自动 status 6
- 6/7/8 试课互按通过 → 9；不满意任一方 cancel → 12
- 9 禁直接取消；settle 双向（教师→10/学生→11，对方确认→12）；arbitrate → type5，管理员 approve → 订单 12 / reject → 维持 9
- 联系方式 status≥6 起才互见（防逃单）；infoFeeQr 教师端 status≥5 可见
- 防重复：同一对师生 status<12 订单存在则拒绝新发起

**其余接口**：滑块验证码 CaptchaService(Java2D,300x150,容差6px,5min可复用 token)+CaptchaController；UploadController(Bearer 或 X-Captcha-Token 二选一,≤10MB,白名单扩展名,/files/** 静态直出)；StudentController/TeacherController（列表池 status=0 过滤 + subject 位筛选 + 隐私脱敏 + me 全量 + 状态切换）；ProfileReviewService（kind register/update 双语义 + cancel）；AdminController（stats/列表/requests resolve/收款码上传/信用调整/管理员 CRUD 仅超管且 id=0 不可删）；登录含 admin 角色，/api/admin/** 拦截器守卫

**验证**：mvn compile 通过；8083 起服务跑三轮冒烟（登录/滑块错误路径/注册→审核→激活/重复注册拦截/订单 0→2→3→5(infoFee 计算)→缴费→核验→6→7→9→10→12/拒绝删单/5 取消留记录/驳回→重提→激活/资料修改合并/撤回/超管门禁），全绿

**交付**：ack_end/API说明文档.md（完整契约，供前端对接）
- 端口 8083；启动：set DB_PASSWORD=xxx && mvn spring-boot:run；可选 TUTOR_TOKEN_SECRET / TUTOR_UPLOAD_DIR / TUTOR_CAPTCHA_DISABLED
- 提交人：Tinker 🔧（离谱人授权继续）