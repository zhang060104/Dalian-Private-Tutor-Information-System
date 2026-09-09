package com.daliantutor.dto;

import lombok.Data;

/**
 * 登录参数：phone + password + role（teacher / student / admin）
 */
@Data
public class LoginParams {
    private String phone;
    private String password;
    private String role;
}
