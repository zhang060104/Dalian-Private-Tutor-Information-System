package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.service.CaptchaService;
import com.daliantutor.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 图片上传：收款码/身份证/证书/支付截图/仲裁证据。
 * 鉴权二选一：Authorization Bearer（登录态）或 X-Captcha-Token（注册前匿名上传需先过滑块）。
 * 返回可访问的相对地址 /files/yyyy/MM/uuid.ext（经静态映射直出）。
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Set<String> ALLOWED_EXT = Set.of("png", "jpg", "jpeg", "webp");

    private final CaptchaService captchaService;

    @Value("${daliantutor.upload-dir}")
    private String uploadDir;

    @Value("${daliantutor.token-secret}")
    private String secret;

    public UploadController(CaptchaService captchaService) {
        this.captchaService = captchaService;
    }

    @PostMapping
    public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file,
                                                   @RequestHeader(value = "Authorization", required = false) String auth,
                                                   @RequestHeader(value = "X-Captcha-Token", required = false) String captchaToken,
                                                   HttpServletRequest request) {
        // 鉴权：登录态 或 滑块 token 二选一
        boolean authed = false;
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                TokenUtil.verify(auth.substring(7).trim(), secret);
                authed = true;
            } catch (Exception ignored) {
                // fallthrough
            }
        }
        if (!authed) {
            captchaService.consume(captchaToken); // 无效则抛异常
        }

        if (file == null || file.isEmpty()) throw new BizException("请选择文件");
        String original = file.getOriginalFilename();
        String ext = "";
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        }
        if (!ALLOWED_EXT.contains(ext)) throw new BizException("仅支持 png/jpg/jpeg/webp 图片");
        try {
            long maxBytes = 10L * 1024 * 1024;
            if (file.getSize() > maxBytes) throw new BizException("图片不能超过 10MB");
            LocalDate now = LocalDate.now();
            String sub = now.getYear() + "/" + String.format("%02d", now.getMonthValue());
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(sub);
            Files.createDirectories(dir);
            String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Files.write(dir.resolve(name), file.getBytes());
            String url = "/files/" + sub + "/" + name;
            return ApiResponse.ok(Map.of("url", url));
        } catch (BizException e) {
            throw e;
        } catch (IOException e) {
            throw new BizException("文件保存失败：" + e.getMessage());
        }
    }
}
