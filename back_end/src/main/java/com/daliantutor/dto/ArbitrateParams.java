package com.daliantutor.dto;

import lombok.Data;

import java.util.List;

/**
 * 订单毁约仲裁申请（仅授课期间 status=9 可用）-> requestLog type 5
 */
@Data
public class ArbitrateParams {
    /** 文本描述 */
    private String text;
    /** 图片证据（文件地址列表，先经 /api/upload 上传） */
    private List<String> images;
}
