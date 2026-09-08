package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.dto.LoginParams;
import com.daliantutor.dto.LoginVO;
import com.daliantutor.entity.Admin;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.AdminMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.util.PasswordUtil;
import com.daliantutor.util.TokenUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 登录：phone + password + role（teacher / student / admin）
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final AdminMapper adminMapper;

    @Value("${daliantutor.token-secret}")
    private String secret;

    @Value("${daliantutor.token-ttl-hours:168}")
    private long ttlHours;

    public AuthController(TeacherMapper teacherMapper, StudentMapper studentMapper, AdminMapper adminMapper) {
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.adminMapper = adminMapper;
    }

    @PostMapping("/login")
    public ApiResponse<LoginVO> login(@RequestBody LoginParams params) {
        String phone = params.getPhone();
        String password = params.getPassword();
        String role = params.getRole();
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            throw new BizException("手机号和密码不能为空");
        }
        String token;
        switch (role == null ? "" : role) {
            case "teacher" -> {
                Teacher t = teacherMapper.findByPhone(phone);
                if (t == null || !PasswordUtil.matches(password, t.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                token = TokenUtil.issue(t.getId(), "teacher", ttlHours, secret);
                return ApiResponse.ok(new LoginVO(token, t.getId(), t.getNickname(), "teacher", t.getPhone()));
            }
            case "student" -> {
                Student s = studentMapper.findByPhone(phone);
                if (s == null || !PasswordUtil.matches(password, s.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                token = TokenUtil.issue(s.getId(), "student", ttlHours, secret);
                return ApiResponse.ok(new LoginVO(token, s.getId(), s.getNickname(), "student", s.getPhone()));
            }
            case "admin" -> {
                Admin a = adminMapper.findByPhone(phone);
                if (a == null || !PasswordUtil.matches(password, a.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                token = TokenUtil.issue(a.getId(), "admin", ttlHours, secret);
                return ApiResponse.ok(new LoginVO(token, a.getId(), a.getNickname(), "admin", a.getPhone()));
            }
            default -> throw new BizException("角色不合法");
        }
    }
}
