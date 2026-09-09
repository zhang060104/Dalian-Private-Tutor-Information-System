package com.daliantutor.entity;

import lombok.Data;

/**
 * 管理员表 admin
 * id=0 为初始化超级管理员（不可删除，仅超管可创建新管理员）
 */
@Data
public class Admin {
    private Integer id;
    private String nickname;
    private String password;
    private String phone;
    /** 是否超级管理员（1=是）：仅超管可创建/删除管理员；id=0 初始化超管 */
    private Integer isSuper;
}
