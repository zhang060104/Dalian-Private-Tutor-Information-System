package com.daliantutor.dto;

import lombok.Data;

/**
 * 双向选择请求：老师投递简历 / 学生指派老师
 */
@Data
public class OrderApplyParams {
    /** 对方 id（老师发起时为学生 id，学生发起时为老师 id） */
    private Integer targetId;
    /** 发起方：teacher=老师投递简历；student=学生指派老师 */
    private String direction;
}
