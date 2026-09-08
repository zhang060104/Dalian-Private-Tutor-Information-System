package com.daliantutor.config;

import com.daliantutor.common.BizException;
import com.daliantutor.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录鉴权拦截器：校验 Authorization: Bearer 令牌，并把 userId/role 写入 request attribute
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Value("${daliantutor.token-secret}")
    private String secret;

    public static final String ATTR_USER_ID = "authUserId";
    public static final String ATTR_ROLE = "authRole";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 预检请求直接放行（CORS）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String token = extractToken(request);
        String[] parsed = TokenUtil.verify(token, secret);
        String userId = parsed[0];
        String role = parsed[1];

        // 管理端接口仅管理员可访问
        if (request.getRequestURI().startsWith("/api/admin/") && !"admin".equals(role)) {
            throw new BizException("无权限访问管理端接口");
        }

        request.setAttribute(ATTR_USER_ID, userId);
        request.setAttribute(ATTR_ROLE, role);
        return true;
    }

    private String extractToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7).trim();
        }
        throw new BizException("未登录，请先登录");
    }
}
