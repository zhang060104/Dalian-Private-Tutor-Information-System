package com.daliantutor.dto;

import lombok.Data;

/**
 * 发起订单（投递简历 / 免费试课指派）：教师对学生 targetId -> status 0；学生对教师 targetId -> status 1
 */
@Data
public class OrderApplyParams {
    /** 对方 id（教师发起时为学生 id，学生发起时为教师 id） */
    private Integer targetId;
    /** 滑块验证码签发的一次性令牌 */
    private String captchaToken;
}
