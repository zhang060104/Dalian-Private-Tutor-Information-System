package com.daliantutor.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 个人信息审核请求（用户查看 / 管理员审核）
 * kind=register 入驻申请 / update 资料修改
 */
@Data
public class ProfileReviewVO {

    private Integer id;

    /** teacher / student */
    private String role;

    /** 提交人手机号（登录标识） */
    private String phone;

    /** register=入驻申请 / update=资料修改 */
    private String kind;

    /** 提交时填写的昵称 */
    private String name;

    private String submittedAt;

    /** 处理状态：-1=待审核，>=0 已由该管理员处理 */
    private Integer adminId;

    /** 处理结果：approved / rejected（仅已处理有值） */
    private String decision;

    /** 管理员备注 */
    private String note;

    /** 字段差异清单（kind=update 展示用） */
    private List<ProfileFieldDiff> fields;

    /** 提交/修正后的完整资料快照（kind=register / 管理员可在此手动修正） */
    private Map<String, Object> profile;
}
