package com.daliantutor.dto;

import lombok.Data;

/**
 * 上传支付截图：type = depositTea(教师定金) / depositStu(学生定金) / infoFee(教师信息费)
 * 上传后生成对应 requestLog（type 2/3/4）等待管理员核验
 */
@Data
public class PaymentParams {
    private String type;
    /** 支付截图文件地址（先经 /api/upload 上传） */
    private String imageUrl;
}
