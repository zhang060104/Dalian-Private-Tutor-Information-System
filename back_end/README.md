# back_end · 大连家教信息系统后端

> 数据库无法随代码同步到队友电脑，因此**表结构以 SQL 脚本形式入库**，任何一台装了 MySQL 8.0+ 的机器跑一次构建脚本即可得到一致的数据库。

## 目录

```
back_end/
├── 数据库设计说明文档.md   # 设计权威来源（表结构以它为准）
├── build_db.sh             # 一键构建脚本（Git Bash / Linux / macOS）
├── build_db.bat            # 一键构建脚本（Windows cmd，双击也能用）
└── sql/
    ├── schema.sql          # 建库 + 建表（幂等，可重复执行）
    └── seed.sql            # 演示种子数据（可选）
```

## 快速开始

### Windows（cmd / PowerShell）

```bat
cd back_end
build_db.bat root 你的密码 --seed
```

### Git Bash / Linux / macOS

```bash
cd back_end
chmod +x build_db.sh
./build_db.sh -u root -p 你的密码 --seed
```

不带参数直接运行会**交互式提示输入密码**（不回显）。

### 参数

| 参数 | 说明 | 默认 |
|------|------|------|
| `-u` / 第 1 个位置参数 | 用户名 | `root` |
| `-p` / 第 2 个位置参数 | 密码 | 交互式输入 |
| `-h` | 主机 | `127.0.0.1` |
| `-P` | 端口 | `3306` |
| `--seed` | 构建后写入演示数据（3 教师 + 3 学生 + 1 管理员，密码均为 `******`） | 关 |
| `--reset` | ⚠️ 先 `DROP DATABASE` 再重建，**会清空现有数据** | 关 |

脚本幂等：不带 `--reset` 时已存在的表不会被重建或清数据，可放心重复执行。

## 表清单

| 表 | 说明 |
|----|------|
| `student` | 学生（含 7×int 空余时间位图、科目位掩码、`POINT SRID 4326` 坐标） |
| `teacher` | 教师（字段同学生，文档版本暂无 location / address） |
| `order` | 家教订单（保留字，SQL 中必须写 `` `order` ``），含定金/信息费核验位 |
| `admin` | 管理员 |
| `requestLog` | 管理员待审核请求（信息修改 / 缴费核验） |

数据库名：`dalian_tutor`，字符集 `utf8mb4`。

## 构建验证状态 ✅

已在 **MySQL 8.0.46 / Windows** 实测通过：

- 5 张表全部创建，`student` / `teacher` / `` `order` `` / `admin` / `requestLog` 字段与
  《数据库设计说明文档》逐条一致
- `student.location` 实测 `SRS_ID = 4326`，`ST_Latitude` / `ST_Longitude` 读数正确
- 订单外键（student / teacher）联表查询正常
- 脚本幂等：连续执行 2 次，种子数据仍为 1 管理员 + 3 教师 + 3 学生，无重复无覆盖
- 种子科目位掩码解码正确（如 `subject=10` → 数学+物理，`8193` → 语文+钢琴）

## 数据库账号（演示）

文档规定**登录使用 phone + password**。种子账号：

| 角色 | 登录手机号 | 密码 | 昵称 |
|------|-----------|------|------|
| 管理员 | 138****0000 | ****** | admin |
| 教师 | 138****0001 / 002 / 003 | ****** | 王老师 / 李老师 / 张老师 |
| 学生 | 139****0001 / 002 / 003 | ****** | 同学甲 / 同学乙 / 同学丙 |

⚠️ 与前端 mock 账号的差异：前端 `stores/system.ts` 目前用 **username + password**
（`teacher1` / `student1` / `admin`），数据库是 **phone + password**。
后端接入时前端登录表单需改为手机号登录（或后端加 username 字段），请提前对齐。

## 位运算备忘

科目、空余时间都是 int 位图，低 24 位有效：

```sql
-- 查需要数学（bit1）的学生
SELECT * FROM student WHERE `subject` & (1 << 1) > 0;

-- 查周一 8:00~9:00（bit8）有空的老师
SELECT * FROM teacher WHERE timeTable1 & (1 << 8) > 0;

-- 订单：教师定金已缴（verification bit0）
SELECT * FROM `order` WHERE verification & 1 > 0;
```

## 📍 坐标字段（location）读写约定 —— 后端必读

MySQL 为 SRID 4326 定义的轴序是 `AXIS["Lat",NORTH],AXIS["Lon",EAST]`（**纬度在前**），
实测行为如下，写错不会报错但经纬度会整体互换：

| 操作 | 正确写法 | 说明 |
|------|---------|------|
| 写入 | `ST_SRID(POINT(经度, 纬度), 4326)` | 函数入参按「经度, 纬度」传 |
| 写入（WKT） | `ST_GeomFromText('POINT(纬度 经度)', 4326)` | ⚠️ WKT 反过来，**纬度在前**；写成 `POINT(经度 纬度)` 会直接报错 `Latitude out of range` |
| 读取 | `ST_Latitude(location)` / `ST_Longitude(location)` | ✅ 推荐，语义明确 |
| 读取 | `ST_X(location)` / `ST_Y(location)` | ⚠️ X = **纬度**，Y = **经度**，与常规 GIS 直觉相反，容易踩坑 |

实测（大连沙河口区，纬度 38.914 / 经度 121.5946）：

```sql
SELECT ST_Latitude(location), ST_Longitude(location) FROM student WHERE id = 1;
-- 38.914    121.5946      ✅ 正确
```

后续接高德地图时注意：高德（GCJ-02）与数据库存的 WGS-84 存在火星坐标偏移，
调用高德接口前需做 WGS-84 → GCJ-02 转换，不能直接把库里的经纬度传给高德。

## ⚠️ 接入前必须处理的已知问题

1. **科目 / 年级编码前后端不一致**
   数据库文档规定 24 科目位序（`0语文 1数学 2英语 …`），而
   `front_end/src/data/tutors.ts` 的 `SUBJECT_OPTIONS` 只有 12 项且顺序不同
   （`[0]小学全科 [1]语文 [2]数学 … [11]钢琴`）；年级文档是数值编码
   （`0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学`），前端是字符串枚举。
   **两边直接互通会导致科目完全错位**，需先统一（详见 `sql/seed.sql` 顶部注释）。
2. **teacher 表缺地址字段**：文档 teacher 定义未列 `location` / `address`，但业务要求
   「缴费后向对方展示地址」，待文档确认后补（语句已写在 `schema.sql` 注释里）。
3. **密码明文**：种子数据与当前字段设计均为明文，正式环境必须改哈希存储
   （`password` 字段已预留 `CHAR(64)` 以兼容 bcrypt）。
