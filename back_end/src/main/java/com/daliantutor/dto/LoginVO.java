package com.daliantutor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 登录响应
 */
@Data
@AllArgsConstructor
public class LoginVO {
    private String token;
    private Integer id;
    private String nickname;
    private String role;
    private String phone;
}
