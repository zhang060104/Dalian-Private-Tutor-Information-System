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
