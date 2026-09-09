package com.daliantutor.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 家教订单表 `order`
 * status 状态机（0~12，引导整个订单流程）：
 *   0 教师已投递简历，等待学生确认
 *   1 学生已指派/发起免费试课，等待教师确认
 *   2 双方已确认订单，进入明细确认程序（无人修改）
 *   3 学生端已修改订单明细，等待教师端审核
 *   4 教师端已修改订单明细，等待学生端审核
 *   5 明细一致，进入费用缴纳核验（等待管理员核验定金/信息费）
 *   6 费用核验完成，进入试课阶段（此时首次互示电话/地址）
 *   7 学生端完成试课确认下单，教师端未确认
 *   8 教师端完成试课确认下单，学生端未确认
 *   9 双方试课通过，进入授课服务期间
 *   10 教师发起结单请求，等待学生端同意
 *   11 学生发起结单请求，等待教师端同意
 *   12 订单已结束（保留记录不删除）
 * 注：status 0/1（简历刚投递阶段）被拒绝或超 24h 未确认 → 物理删除；
 *     2 及以后的取消/结束 → status=12 保留。
 * verification 低 3 位：bit0=教师定金已缴 bit1=学生定金已缴 bit2=教师信息费已缴
 */
@Data
public class Order {
    private Integer id;
    private Integer studentId;
    private Integer teacherId;
    /** 授课科目位掩码（低 24 位） */
    private Integer subject;
    /** 授课时薪（元/小时） */
    private Integer hourlyWage;
    /** 教师定金支付截图（服务器地址） */
    private String depositImgTea;
    /** 学生定金支付截图（服务器地址） */
    private String depositImgStu;
    /** 教师信息费支付截图（服务器地址） */
    private String infoFeeImg;
    /** 管理员上传的信息费收款码（服务器地址） */
    private String infoFeeQr;
    /** 授课服务说明 */
    private String description;
    private Integer status;
    private Integer verification;
    /** 信息费（元）= hourlyWage × 首周总课时 */
    private Integer infoFee;
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
