package com.daliantutor.dto;

import lombok.Data;

/**
 * 注册请求（老师/学生共用，字段按角色填写）
 */
@Data
public class RegisterParams {
    private String nickname;
    private String password;
    private String phone;
    private Integer age;
    private String gender;
    /** 年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 */
    private Integer grade;
    /** 科目位掩码（低 24 位） */
    private Integer subject;
    private String description;
    /** 学生地址（老师可忽略） */
    private String address;
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
}
