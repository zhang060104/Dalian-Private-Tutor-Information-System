package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.dto.CaptchaVO;
import com.daliantutor.service.CaptchaService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 滑块验证码：GET 生成，POST 校验（误差 <=6px 通过并签发一次性 token）
 * token 5 分钟内有效、可重复使用（注册/改资料/发起订单前需携带）
 */
@RestController
@RequestMapping("/api/captcha")
public class CaptchaController {

    private final CaptchaService captchaService;

    public CaptchaController(CaptchaService captchaService) {
        this.captchaService = captchaService;
    }

    @GetMapping
    public ApiResponse<CaptchaVO> generate() {
        return ApiResponse.ok(captchaService.generate());
    }

    @PostMapping("/verify")
    public ApiResponse<Map<String, String>> verify(@RequestBody Map<String, Object> body) {
        String captchaId = (String) body.get("captchaId");
        Object xRaw = body.get("x");
        int x = xRaw instanceof Number n ? n.intValue() : -999;
        String token = captchaService.verify(captchaId, x);
        return ApiResponse.ok(Map.of("token", token));
    }
}
