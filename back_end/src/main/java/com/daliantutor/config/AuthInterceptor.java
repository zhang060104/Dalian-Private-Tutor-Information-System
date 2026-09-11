package com.daliantutor.config;

import com.daliantutor.common.BizException;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录鉴权拦截器：校验 Authorization: Bearer 令牌，并把 userId/role 写入 request attribute
 *
 * 另：学生/教师账号若已注销（status=-2）或已被删除，令牌立即失效——
 * 否则注销后旧令牌在过期（默认 168h）前仍可正常调用接口。
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    /** 账号已注销的状态值（与 AuthController / AdminController 保持一致） */
    private static final int STATUS_DEACTIVATED = -2;

    @Value("${daliantutor.token-secret}")
    private String secret;

    private final StudentMapper studentMapper;
    private final TeacherMapper teacherMapper;

    public AuthInterceptor(StudentMapper studentMapper, TeacherMapper teacherMapper) {
        this.studentMapper = studentMapper;
        this.teacherMapper = teacherMapper;
    }

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

        // 学生/教师账号有效性校验（已注销或已删除 -> 令牌立即失效）
        if ("student".equals(role) || "teacher".equals(role)) {
            int uid;
            try {
                uid = Integer.parseInt(userId);
            } catch (NumberFormatException e) {
                throw new BizException("登录状态异常，请重新登录");
            }
            Integer status;
            if ("student".equals(role)) {
                Student s = studentMapper.findById(uid);
                status = s == null ? null : s.getStatus();
            } else {
                Teacher t = teacherMapper.findById(uid);
                status = t == null ? null : t.getStatus();
            }
            if (status == null || status == STATUS_DEACTIVATED) {
                throw new BizException("账号不存在或已被注销，请重新登录");
            }
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
