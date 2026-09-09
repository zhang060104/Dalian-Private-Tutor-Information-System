package com.daliantutor.dto;

import lombok.Data;

/**
 * 提交订单信息（教授科目/时薪/授课时间表/说明），由提交方角色决定 status -> 3(学生) 或 4(教师)
 */
@Data
public class OrderDetailParams {
    private Integer subject;
    private Integer hourlyWage;
    private String description;
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
}
