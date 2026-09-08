package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查（公开，用于探活/部署检查）
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("status", "up");
        r.put("service", "dalian-tutor-back");
        r.put("time", LocalDateTime.now().toString());
        return ApiResponse.ok(r);
    }
}
