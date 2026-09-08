package com.daliantutor.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员待审核请求表 requestLog
 * type：0=教师信息修改，1=学生信息修改，2=订单-教师定金核验，3=订单-学生定金核验，4=订单-教师信息费核验
 */
@Data
public class RequestLog {
    private Integer id;
    private Integer type;
    private Integer tarId;
    private String json;
    private LocalDateTime createdAt;
}
