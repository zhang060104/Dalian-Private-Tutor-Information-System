package com.daliantutor.dto;

import com.daliantutor.entity.Order;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 订单展示对象：附带双方昵称，供工作台 / 管理后台展示
 */
@EqualsAndHashCode(callSuper = true)
@Data
public class OrderVO extends Order {
    private String teacherName;
    private String studentName;
    /** 对方昵称（相对当前登录者） */
    private String otherName;
}
