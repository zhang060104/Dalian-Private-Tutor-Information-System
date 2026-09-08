package com.daliantutor.common;

/**
 * 业务异常：message 直接返回给前端提示
 */
public class BizException extends RuntimeException {

    public BizException(String message) {
        super(message);
    }
}
