package com.daliantutor.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 提交个人信息修改申请（审核制）
 *
 * profile 使用与实体一致的字段名（nickname / gender / grade / subject / description /
 * address / timeTable1~7 / qrcode / idcard / certificate 等），审核通过后由服务端合并到
 * teacher / student 表。未出现的字段保持原值。
 */
@Data
public class ProfileReviewSubmit {

    /** 滑块验证码签发的一次性令牌 */
    private String captchaToken;

    /** 提交时填写的昵称（用于管理员展示） */
    private String name;

    /** 字段差异清单（只含变化字段，管理员展示用） */
    private List<ProfileFieldDiff> fields;

    /** 修改后的完整资料（实体字段子集，未出现的字段保持原值） */
    private Map<String, Object> profile;
}
