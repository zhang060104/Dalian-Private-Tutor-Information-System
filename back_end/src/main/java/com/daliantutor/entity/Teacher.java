package com.daliantutor.entity;

import lombok.Data;

/**
 * 教师表 teacher
 */
@Data
public class Teacher {
    private Integer id;
    private String nickname;
    private String password;
    private String phone;
    private Integer age;
    private String gender;
    private Integer credit;
    /** 可授年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 */
    private Integer grade;
    /** 可授科目位掩码（低 24 位） */
    private Integer subject;
    private String description;
    /** 0=正在寻找学生，1=已停止 */
    private Integer status;
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
}
