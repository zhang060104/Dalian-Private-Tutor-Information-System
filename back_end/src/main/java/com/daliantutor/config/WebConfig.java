package com.daliantutor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Web 配置：CORS + 登录拦截 + 上传文件静态映射（/files/** -> upload-dir）
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Value("${daliantutor.upload-dir}")
    private String uploadDir;

    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/captcha",
                        "/api/captcha/verify",
                        "/api/upload",
                        "/api/health"
                );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
        // 上传图片直出也放开跨域（前端 <img> 不受限，canvas/fetch 需要）
        registry.addMapping("/files/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "OPTIONS")
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String abs = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/files/**").addResourceLocations(abs);
    }
}
