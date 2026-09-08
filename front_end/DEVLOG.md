# front_end 开发日志

> ⚠️ 规则：**只增不删**。每次前端改动后，在下方追加记录（时间 / 改动内容 / 提交人），并同步 git 提交推送。

## 2026-09-04 ｜ 前端脚手架初始化（大连私人家教中心门户）
- 使用 Vite 搭建 Vue3 + TypeScript 脚手架：package.json / vite.config.ts / tsconfig.json / env.d.ts / index.html（提交人：WangYi637）
- 集成 Element Plus（中文语言包 + 全量图标）、Vue Router（hash 模式）、Pinia、Axios（`/api` dev 代理占位）
- 全局样式与设计令牌（教育蓝 + 青绿 + 暖金品牌色系，CSS 变量集中在 styles/index.css）；联系方式集中在 types 的 `CENTER_CONTACT`
- 页面骨架：门户布局 PortalLayout（吸顶导航 + 响应式页脚）、首页（Hero/特色/明星教员/流程/FAQ/CTA）、教员库（科目/年级/授课方式筛选 + 排序 + 关键词搜索）、关于中心（介绍/承诺/流程/联系）、找家教（需求表单 + 校验 + 模拟提交）
- 教员数据：src/data/tutors.ts 静态示例数据（9 位 mock，标注勿维护真实师资）；通用组件 TutorCard
- 类型定义齐全：Tutor / TutorRequest / CENTER_CONTACT，strict TS
- `npm run type-check` 与 `npm run build` 均通过
- 待办：后端接口接入后替换 mock 数据与模拟提交（详见 README）

## 2026-09-07 ｜ 角色账号体系：老师/学生/管理员登录 + 入驻 + 互选 + 独立管理后台
- 类型与数据层：`types/index.ts` 扩展 Role / TeacherAccount / StudentAccount / AdminAccount / MatchRelation；新增 `stores/system.ts`（Pinia，localStorage 持久化，预置演示账号 admin·teacher1-3·student1-3，密码 123456）
- 路由：新增 `/login`、`/register`（老师/学生入驻，填写个人信息后自动登录）、`/teacher/home`、`/student/home`（PortalLayout 子路由 + 角色守卫）；`/admin` 为独立顶层路由，**门户不设任何跳转入口、后台页也无站内导航按钮**
- 页面：LoginView（三角色分栏登录 + 演示账号一键填入）；RegisterView（老师：科目/年级/学历/教龄/课时费/简介；学生：年级/科目/家长/备注）；TeacherHomeView（老师选学生，展示"学生选我/已匹配"状态）；StudentHomeView（学生选老师）；AdminHomeView（独立后台：统计卡片 + 入驻老师/学生/匹配关系三个数据面板，仅退出按钮）
- 顶栏：未登录显示「登录/入驻」；登录后显示姓名 + 角色标签 +「我的面板」+ 退出（移动端菜单同步）
- 匹配规则：老师选学生与学生选老师均为单向意向，双向互选即「已匹配」；管理员后台可总览全部关系
- ⚠️ 前端演示模式：数据存本浏览器 localStorage，后端接入后由 API 替换（提交人：Claw 助手 / zhang060104 授权）
- `npm run type-check` 通过

## 2026-09-07 ｜ 空余时间(7×int 位图) + 科目/年级位掩码
- 数据结构：老师/学生资料新增 `availability: number[7]`（0=周一…6=周日）；每个 int 解码为二进制后取**低 24 位**有效，第 h 位=1 表示 h:00–h+1:00 空闲（1=有空/0=没空）；老师 `subjects`/`grades` 与学生 `subjects` 改为**选项下标位掩码 int**（bit i = 选项列表第 i 项，科目选择与空余时间同一编解码思路）
- 工具 `utils/availability.ts`：dayBits/availableHours/encodeDay/dayRanges/scheduleSummary（空余时间）+ decodeOptions/encodeOptions/decodeSubjects/encodeSubjects/decodeGrades/encodeGrades（选项掩码），含越界/去重防护与 0xFFFFFF 掩码约束
- `components/ScheduleEditor.vue`：7 天 × 24 小时点选格编辑器（浅色=没空/深色=有空，title 悬浮显示时段，快捷「工作日 8-18/周末 9-17」与清空），入驻表单老师/学生均接入
- 展示解码：老师工作台/学生空间显示空余时间摘要与科目/年级标签；学生看老师卡片与老师看学生卡片均显示可约时间；管理后台老师/学生表格新增「一周空余时间」列并解码科目/年级
- localStorage 键升级 v2（旧数据自动作废重播种）；预置 7 个演示账号均带空余时间数据
- `npm run type-check` 通过（提交人：Claw 助手 / zhang060104 授权）

## 2026-09-07 ｜ 砍掉「找家教」页 + 服务流程对齐数据库文档 + 科目编码顺序对齐
- 移除「找家教」页面与家教需求提交功能：删除 `ContactView.vue`、`/contact` 路由、顶栏导航项、`TutorRequest` 类型；首页 Hero/CTA、关于页、顶栏 CTA 等指向 `/contact` 的入口统一改为 `/register`（入驻）或 `/tutors`（教员库）
- 首页「四步找到好家教」流程改为数据库设计文档的「运行模式」：① 入驻注册 → ② 双向选择（简历投递）→ ③ 定金锁定（双方定金 + 信息费解锁联系方式）→ ④ 试课开课（通过即授课 / 未通过退一半定金与信息费）；**免费试课并入第 4 步，不再作为独立步骤/特色**
- 首页「为什么选我们」特色卡调整为：师资严选 / 双向选择 / 定金保障 / 平台担保（移除「免费试听」「按次付费」）；FAQ、Hero 信任徽标、CTA 文案同步对齐新模型
- 关于页：服务流程（PROCESS）与「服务承诺」列表对齐数据库模型，移除「专属顾问」「按次付费」等旧表述
- 科目 `SUBJECT_OPTIONS` 对齐数据库文档约定的 24 科编码顺序（语文→数学→…→体育→自定义）；修正 `tutors.ts`、`stores/system.ts` 中无效科目「奥数」
- `npm run type-check` 通过（提交人：Claw 助手 / zhang060104 授权）

## 2026-09-07 ｜ 入驻表单移除「教龄 / 课时费 / 学历背景」
- `TeacherAccount` 类型移除 `years`（教龄）、`pricePerHour`（课时费）、`education`（学历背景）三个字段；入驻表单（老师端）对应录入项、校验规则与提交参数同步删除，老师入驻仅需：账号信息 + 主教科目 + 可教年级 + 个人简介 + 一周空余时间
- 展示层同步清理：管理后台老师表格删除「教龄 / 学历 / 课时费」三列；老师工作台、学生空间（老师卡片）个人信息行移除该三项
- `stores/system.ts` 三个演示老师账号移除这三字段
- ⚠️ 未改动 `Tutor`（教员库公开 mock 展示类型）：`data/tutors.ts` / `TutorCard` / `TutorsView` 的教龄、学历、课时费展示与排序保持原样
- ⚠️ localStorage 已有旧账号数据的浏览器需清缓存/重新播种（键 `tutor_system_v2`），否则旧数据仍带这三字段
- `npm run type-check` 通过（提交人：Claw 助手 / zhang060104 授权）

## 2026-09-08 ｜ 删除数据库无法支撑的业务 + 对齐后端（phone 登录 / 年级数值编码）
- 登录标识由 `username` 改为 `phone`：`AccountBase` 移除 username，登录/入驻/管理后台表单统一用手机号；演示账号对齐数据库种子（老师 13800000001~3、学生 13900000001~3、管理员 13800000000，密码 123456）
- 删除学生「家长称呼 guardian」字段：类型、入驻表单、学生空间、管理后台表格同步移除
- 年级改**单一数值编码**：老师「可教年级」由位掩码多选改为单选 `grade:number`；学生年级由字符串改为数值 `grade:number`
- `data/tutors.ts` 新增 `GRADE_LEVELS`（0幼儿园/1~6小学/7~9初中/10~12高中/13~16大学，17 项）+ `gradeLabel()`；`utils/availability.ts` 移除 `encodeGrades/decodeGrades`
- `MatchRelation` 由 username 标识改为 phone；`stores/system.ts` localStorage 键升级 `tutor_system_v3`
- ⚠️ 门户「教员库」`Tutor` mock 类型（评分/标签/授课方式等营销展示字段）保留原样，不接数据库
- ⚠️ 旧 localStorage（v2）账号数据需清缓存/重新播种
- 提交人：Claw 助手 / zhang060104 授权

## 2026-09-08 ｜ 前端接入后端 API（告别 localStorage 演示）
- 新增 `src/api/http.ts`（axios 实例：请求自动带 Bearer 令牌、响应统一解包 `{code,message,data}` 并弹错）、`src/api/index.ts`（登录/注册/列表/双向选择/管理端接口封装）
- `stores/system.ts` 由 localStorage 演示改为后端 API：登录/注册/列表/选择关系全部走 `/api/*`；令牌存 `localStorage[tutor_token]`，当前登录人缓存 `tutor_system_current` 供路由守卫
- 工作台/学生空间/管理后台 `onMounted` 调 `loadAll`（刷新页面后自动拉取）；管理后台改用 `/api/admin/*` 接口加载全局数据
- 后端实体（nickname/subject/description/timeTable1~7）在前端 store 层映射为前端类型（name/subjects/intro/availability）
- `npm run type-check` 通过（提交人：Claw 助手 / zhang060104 授权）
