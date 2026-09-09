-- =============================================================================
--  大连家教信息系统 · 数据库构建脚本（表结构）
--  依据：项目根目录「项目设计说明文档.md」（2026-09-09 版，覆盖订单全状态机 0~12）
--  环境：MySQL 8.0+（POINT SRID 4326 需 8.0+）
--  特性：幂等 —— 可重复执行，已存在的表不会被重建/清数据
--  用法：由 back_end/build_db.sh / build_db.bat 调用（--reset 会先删库重建）；
--        mysql -u root -p < back_end/sql/schema.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `dalian_tutor`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `dalian_tutor`;

-- =============================================================================
-- 1. student 学生表
--    登录：phone + password；注册/资料修改均需管理员审核（requestLog type=1）
-- =============================================================================
CREATE TABLE IF NOT EXISTS `student` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`    CHAR(16)      NOT NULL DEFAULT ''            COMMENT '昵称',
  `password`    CHAR(64)      NOT NULL DEFAULT ''            COMMENT '登录密码（BCrypt 哈希）',
  `phone`       CHAR(11)      NOT NULL                       COMMENT '登录手机号（唯一）',
  `age`         INT           NULL                           COMMENT '年龄',
  `gender`      CHAR(1)       NULL                           COMMENT '性别：男 / 女',
  `credit`      INT           NOT NULL DEFAULT 100           COMMENT '信用分（默认 100，管理员可按订单审核调整）',
  `grade`       INT           NOT NULL DEFAULT 0             COMMENT '年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业',
  `subject`     INT           NOT NULL DEFAULT 0             COMMENT '需要辅导的科目位掩码，低 24 位有效（见文档科目顺序）',
  `description` TEXT          NULL                           COMMENT '个人简介',
  `status`      INT           NOT NULL DEFAULT 0             COMMENT '0=正在寻找老师 1=已停止寻找（status=1 不参与学生列表）',
  `timeTable1`  INT           NOT NULL DEFAULT 0             COMMENT '周一可接受家教时间位图（低 24 位 = 24 小时）',
  `timeTable2`  INT           NOT NULL DEFAULT 0             COMMENT '周二时间位图',
  `timeTable3`  INT           NOT NULL DEFAULT 0             COMMENT '周三时间位图',
  `timeTable4`  INT           NOT NULL DEFAULT 0             COMMENT '周四时间位图',
  `timeTable5`  INT           NOT NULL DEFAULT 0             COMMENT '周五时间位图',
  `timeTable6`  INT           NOT NULL DEFAULT 0             COMMENT '周六时间位图',
  `timeTable7`  INT           NOT NULL DEFAULT 0             COMMENT '周日时间位图',
  `location`    POINT SRID 4326 NULL                         COMMENT '坐标（WGS84），高德导航预留字段，暂不参与业务',
  `address`     TEXT          NULL                           COMMENT '地址说明（订单完成缴费核验后才对教师方展示）',
  `QRcode`      TEXT          NULL                           COMMENT '收款码图片在服务器中的文件目录地址',
  `IDcard`      TEXT          NULL                           COMMENT '身份证人像面图片在服务器中的文件目录地址',
  UNIQUE KEY `uk_student_phone` (`phone`),
  KEY `idx_student_status` (`status`),
  KEY `idx_student_grade` (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生表';

-- =============================================================================
-- 2. teacher 教师表
--    ⚠️ 工程性补充（相对文档）：文档 teacher 定义未含 location/address，
--       但运行模式要求「信息费核验后双向展示地址」，教师方也需要地址字段，
--       故与 student 对齐补充 address / location（文档确认后如不需要可删）。
-- =============================================================================
CREATE TABLE IF NOT EXISTS `teacher` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`    CHAR(16)      NOT NULL DEFAULT ''            COMMENT '昵称',
  `password`    CHAR(64)      NOT NULL DEFAULT ''            COMMENT '登录密码（BCrypt 哈希）',
  `phone`       CHAR(11)      NOT NULL                       COMMENT '登录手机号（唯一）',
  `age`         INT           NULL                           COMMENT '年龄',
  `gender`      CHAR(1)       NULL                           COMMENT '性别：男 / 女',
  `credit`      INT           NOT NULL DEFAULT 100           COMMENT '信用分（默认 100，管理员可按订单审核调整）',
  `grade`       INT           NOT NULL DEFAULT 0             COMMENT '可授年级：13及以上为教师可选（文档：教师端仅可选择13及以上）',
  `subject`     INT           NOT NULL DEFAULT 0             COMMENT '可授科目位掩码，低 24 位有效',
  `description` TEXT          NULL                           COMMENT '个人简介',
  `status`      INT           NOT NULL DEFAULT 0             COMMENT '0=正在寻找学生 1=已停止寻找（status=1 不参与教师列表）',
  `timeTable1`  INT           NOT NULL DEFAULT 0             COMMENT '周一可提供家教时间位图（低 24 位 = 24 小时）',
  `timeTable2`  INT           NOT NULL DEFAULT 0             COMMENT '周二时间位图',
  `timeTable3`  INT           NOT NULL DEFAULT 0             COMMENT '周三时间位图',
  `timeTable4`  INT           NOT NULL DEFAULT 0             COMMENT '周四时间位图',
  `timeTable5`  INT           NOT NULL DEFAULT 0             COMMENT '周五时间位图',
  `timeTable6`  INT           NOT NULL DEFAULT 0             COMMENT '周六时间位图',
  `timeTable7`  INT           NOT NULL DEFAULT 0             COMMENT '周日时间位图',
  `location`    POINT SRID 4326 NULL                         COMMENT '坐标（WGS84），高德导航预留字段（工程性补充，同 student）',
  `address`     TEXT          NULL                           COMMENT '地址说明（订单完成缴费核验后才对学生方展示）（工程性补充，同 student）',
  `QRcode`      TEXT          NULL                           COMMENT '收款码图片在服务器中的文件目录地址',
  `IDcard`      TEXT          NULL                           COMMENT '身份证人像面图片在服务器中的文件目录地址',
  `certificate` TEXT          NULL                           COMMENT '教师资格/资质证书图片在服务器中的文件目录地址（教师特有）',
  UNIQUE KEY `uk_teacher_phone` (`phone`),
  KEY `idx_teacher_status` (`status`),
  KEY `idx_teacher_grade` (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师表';

-- =============================================================================
-- 3. `order` 订单表（order 是 SQL 保留字，必须反引号包裹）
--    状态机（status 引导整个订单运行流程）：
--      0  = 教师已投递简历，等待学生确认
--      1  = 学生已指派/发起免费试课申请，等待教师确认
--      2  = 双方已确认订单，进入订单明细确认程序（无人修改）
--      3  = 学生端已修改订单明细，等待教师端审核
--      4  = 教师端已修改订单明细，等待学生端审核
--      5  = 双方明细一致，进入费用缴纳核验阶段（等待管理员核验）
--      6  = 费用核验完成，进入试课阶段（此时首次展示对方电话/地址）
--      7  = 学生端完成试课确认下单，教师端未确认
--      8  = 教师端完成试课确认下单，学生端未确认
--      9  = 双方试课均通过，进入授课服务期间
--      10 = 教师发起结单请求，等待学生端同意
--      11 = 学生发起结单请求，等待教师端同意
--      12 = 订单已结束（取消/结单/仲裁终止，保留记录不删除）
--    注：status 0/1（简历刚投递尚未确认）时被拒绝或超 24 小时未确认 → 物理删除；
--        已进入 2 及以后的取消 → status=12 保留记录。
--    verification 低 3 位（bit0=1 教师定金已缴 / bit1=1 学生定金已缴 / bit2=1 教师信息费已缴）
-- =============================================================================
CREATE TABLE IF NOT EXISTS `order` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`    INT           NOT NULL                     COMMENT '学生 id',
  `teacher_id`    INT           NOT NULL                     COMMENT '教师 id',
  `subject`       INT           NOT NULL DEFAULT 0           COMMENT '授课科目位掩码（低 24 位）',
  `hourly_wage`   INT           NOT NULL DEFAULT 0           COMMENT '授课时薪（元/小时）',
  `depositImgTea` TEXT          NULL                         COMMENT '教师定金支付截图（服务器存储地址）',
  `depositImgStu` TEXT          NULL                         COMMENT '学生定金支付截图（服务器存储地址）',
  `infoFeeImg`    TEXT          NULL                         COMMENT '教师信息费支付截图（服务器存储地址）',
  `infoFeeQR`     TEXT          NULL                         COMMENT '管理员上传的信息费收款码（服务器存储地址）',
  `description`   TEXT          NULL                         COMMENT '授课服务说明（教师/学生均可修改）',
  `status`        INT           NOT NULL DEFAULT 0           COMMENT '订单状态机 0~12，见上',
  `verification`  INT           NOT NULL DEFAULT 0           COMMENT '低 3 位：bit0 教师定金 / bit1 学生定金 / bit2 教师信息费，1=已缴',
  `infoFee`       INT           NOT NULL DEFAULT 0           COMMENT '信息费（元）= 首周工资总额 = hourly_wage × 一周总课时数',
  `timeTable1`    INT           NOT NULL DEFAULT 0           COMMENT '周一授课时间位图（低 24 位）',
  `timeTable2`    INT           NOT NULL DEFAULT 0           COMMENT '周二授课时间位图',
  `timeTable3`    INT           NOT NULL DEFAULT 0           COMMENT '周三授课时间位图',
  `timeTable4`    INT           NOT NULL DEFAULT 0           COMMENT '周四授课时间位图',
  `timeTable5`    INT           NOT NULL DEFAULT 0           COMMENT '周五授课时间位图',
  `timeTable6`    INT           NOT NULL DEFAULT 0           COMMENT '周六授课时间位图',
  `timeTable7`    INT           NOT NULL DEFAULT 0           COMMENT '周日授课时间位图',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（投递简历 24 小时超时清理依赖此字段）',
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_order_student` (`student_id`),
  KEY `idx_order_teacher` (`teacher_id`),
  KEY `idx_order_status` (`status`),
  KEY `idx_order_created` (`created_at`),
  CONSTRAINT `fk_order_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家教订单表';

-- =============================================================================
-- 4. admin 管理员表
--    ⚠️ 初始化一条 id=0 的超级管理员（不可删除，仅超级管理员可创建新管理员）
-- =============================================================================
CREATE TABLE IF NOT EXISTS `admin` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`  CHAR(16) NOT NULL DEFAULT ''                   COMMENT '昵称',
  `password`  CHAR(64) NOT NULL DEFAULT ''                   COMMENT '登录密码（BCrypt 哈希）',
  `phone`     CHAR(11) NOT NULL                              COMMENT '手机号（唯一）',
  `is_super`  TINYINT  NOT NULL DEFAULT 0                    COMMENT '是否超级管理员：1=是（id=0 初始超管），仅超管可创建新管理员',
  UNIQUE KEY `uk_admin_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- =============================================================================
-- 5. requestLog 管理员待审核请求表
--    type：0=教师信息修改（含注册） 1=学生信息修改（含注册）
--          2=订单-教师定金核验 3=订单-学生定金核验 4=订单-教师信息费核验
--          5=订单毁约仲裁
--    tarID：type 0→教师 id / 1→学生 id / 2~5→订单 id
--    json：请求详情（注册/修改后的资料快照、付款截图地址、仲裁文本与证据图片地址等）
--    admin_id：-1=尚无管理员处理；有管理员处理后替换为对应 admin id（其他管理员不可再介入）
-- =============================================================================
CREATE TABLE IF NOT EXISTS `requestLog` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `type`       INT      NOT NULL                             COMMENT '0教师信息修改/注册 1学生信息修改/注册 2教师定金核验 3学生定金核验 4教师信息费核验 5仲裁',
  `tarID`      INT      NOT NULL                             COMMENT '目标 id（type 0→教师 id，1→学生 id，2~5→订单 id）',
  `json`       TEXT     NULL                                 COMMENT '请求详情 JSON',
  `admin_id`   INT      NOT NULL DEFAULT -1                  COMMENT '处理管理员 id，-1=未处理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间',
  KEY `idx_request_type` (`type`),
  KEY `idx_request_tar` (`tarID`),
  KEY `idx_request_admin` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员待审核请求表';

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 构建结果自检
-- ---------------------------------------------------------------------------
SELECT TABLE_NAME AS `表`, TABLE_COMMENT AS `说明`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'dalian_tutor'
ORDER BY TABLE_NAME;
