package com.daliantutor.dto;

import lombok.Data;

/**
 * 滑块验证码响应
 */
@Data
public class CaptchaVO {
    private String captchaId;
    /** base64 png（含缺口） */
    private String background;
    /** base64 png（拼块） */
    private String puzzle;
}
