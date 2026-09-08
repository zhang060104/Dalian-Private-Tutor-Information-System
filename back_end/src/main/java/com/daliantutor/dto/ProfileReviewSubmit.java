package com.daliantutor.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 提交个人资料修改申请
 *
 * profile 使用后端实体字段名（nickname / gender / grade / subject / description /
 * address / timeTable1~7），审核通过后由服务端直接合并进 teacher / student 表。
 */
@Data
public class ProfileReviewSubmit {

    /** 提交时快照的姓名（便于管理端展示） */
    private String name;

    /** 字段级变更清单（只含有变化的字段） */
    private List<ProfileFieldDiff> fields;

    /** 新资料（后端实体字段的子集，未出现的字段保持原值） */
    private Map<String, Object> profile;
}
