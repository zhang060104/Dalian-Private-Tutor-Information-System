package com.daliantutor.entity;

import lombok.Data;

/**
 * 管理员表 admin
 */
@Data
public class Admin {
    private Integer id;
    private String nickname;
    private String password;
    private String phone;
}
