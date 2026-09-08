package com.daliantutor.dto;

import lombok.Data;

import java.util.List;

/**
 * 个人资料修改申请（申请人查看 / 管理端审核）
 */
@Data
public class ProfileReviewVO {

    private Integer id;

    /** teacher / student */
    private String role;

    /** 申请人手机号（登录标识） */
    private String phone;

    /** 申请人姓名（提交时快照） */
    private String name;

    private String submittedAt;

    /** 字段级变更清单 */
    private List<ProfileFieldDiff> fields;
}
