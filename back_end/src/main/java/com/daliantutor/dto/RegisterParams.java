package com.daliantutor.dto;

import lombok.Data;

/**
 * 入驻注册申请参数（role=teacher / student）
 * 注册走管理员审核：本参数整体存入 requestLog（type 0=教师 / 1=学生），
 * 审核通过后由管理员操作创建正式账号（password 以 BCrypt 哈希随 json 暂存）。
 */
@Data
public class RegisterParams {
    /** teacher / student */
    private String role;
    /** 滑块验证码签发的一次性令牌 */
    private String captchaToken;
    private String nickname;
    private String password;
    private String phone;
    private Integer age;
    /** 男 / 女 */
    private String gender;
    /** 0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学 17已毕业 */
    private Integer grade;
    /** 科目位掩码（低 24 位） */
    private Integer subject;
    private String description;
    private String address;
    private Integer timeTable1;
    private Integer timeTable2;
    private Integer timeTable3;
    private Integer timeTable4;
    private Integer timeTable5;
    private Integer timeTable6;
    private Integer timeTable7;
    /** 收款码图片地址（注册必填） */
    private String qrcode;
    /** 身份证人像面图片地址（注册必填） */
    private String idcard;
    /** 资质证书图片地址（教师可填） */
    private String certificate;
}
