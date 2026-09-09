package com.daliantutor.entity;

import lombok.Data;

/**
 * 教师表 teacher
 * 登录：phone + password；注册/资料修改需管理员审核（requestLog type=0）
 */
@Data
public class Teacher {
    private Integer id;
    private String nickname;
    private String password;
    private String phone;
    private Integer age;
    /** 性别：男 / 女 */
    private String gender;
    /** 信用分（默认 100，管理员可调整） */
    private Integer credit;
    /** 可授年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业（教师端仅 13+ 可选） */
    private Integer grade;
    /** 可授科目位掩码（低 24 位，见文档科目顺序） */
    private Integer subject;
    /** 个人简介 */
    private String description;
    /** 0=正在寻找学生 1=已停止寻找（status=1 不参与列表） */
    private Integer status;
    /** 周一~周日可提供家教时间位图（低 24 位 = 24 小时） */
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
    /** 坐标（WGS84）高德导航预留字段：不参与业务读写（数据库 POINT 列） */
    private String address;
    /** 收款码图片文件目录地址 */
    private String qrcode;
    /** 身份证人像面图片文件目录地址 */
    private String idcard;
    /** 教师资格/资质证书图片文件目录地址 */
    private String certificate;
}
