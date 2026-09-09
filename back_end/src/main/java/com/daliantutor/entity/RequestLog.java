package com.daliantutor.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员待审核请求表 requestLog
 * type：0=教师信息修改/入驻申请 1=学生信息修改/入驻申请
 *       2=订单-教师定金核验 3=订单-学生定金核验 4=订单-教师信息费核验 5=订单毁约仲裁
 * tarID：type 0→教师 id，1→学生 id，2~5→订单 id（入驻申请 tarID=0，json 内含完整注册资料）
 * json：请求详情（注册/修改后的资料快照、付款截图地址、仲裁文本与证据地址等）
 * admin_id：-1=尚无管理员处理；处理后替换为处理管理员 id（其他管理员不可介入）
 */
@Data
public class RequestLog {
    private Integer id;
    private Integer type;
    private Integer tarId;
    private String json;
    private Integer adminId;
    private LocalDateTime createdAt;
}
