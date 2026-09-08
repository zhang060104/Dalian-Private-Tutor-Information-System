package com.daliantutor.dto;

import lombok.Data;

/**
 * 登录请求：phone + password + 角色
 */
@Data
public class LoginParams {
    private String phone;
    private String password;
    /** teacher / student / admin */
    private String role;
}
