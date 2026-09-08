package com.daliantutor.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 订单表 `order`
 * status：0=教师已投递待学生确认；1=学生已指派待教师确认；2=明细确认中；
 *         3=学生已修改待教师审核；4=教师已修改待学生审核；5=待缴费并由管理员核验
 */
@Data
public class Order {
    private Integer id;
    private Integer studentId;
    private Integer teacherId;
    private Integer subject;
    private Integer hourlyWage;
    private String depositImgTea;
    private String depositImgStu;
    private String infoFeeImg;
    private String infoFeeQR;
    private String description;
    private Integer status;
    /** 低 3 位：bit0=教师定金已缴，bit1=学生定金已缴，bit2=教师信息费已缴 */
    private Integer verification;
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
