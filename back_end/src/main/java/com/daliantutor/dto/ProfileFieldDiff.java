package com.daliantutor.dto;

import lombok.Data;

/**
 * 个人资料修改审核：单个字段的新旧对比（面向管理端展示）
 */
@Data
public class ProfileFieldDiff {

    /** 字段中文名，如「姓名」「主教科目」 */
    private String label;

    /** 修改前（当前生效）的值文本 */
    private String old;

    /** 申请修改后的值文本 */
    private String next;
}
