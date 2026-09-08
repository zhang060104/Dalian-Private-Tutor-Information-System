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
