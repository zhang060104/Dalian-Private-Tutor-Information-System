package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.entity.Admin;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.AdminMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.service.ProfileReviewService;
import com.daliantutor.util.PasswordUtil;
import com.daliantutor.util.TokenUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 注册 / 登录。登录：phone + password + role（teacher / student / admin）。
 * 注册 = 入驻申请：创建账号 + 提交个人信息审核（requestLog type 0/1），
 * 审核通过（管理员 resolve approve）后账号 status 由 1 置 0，开始参与列表。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final AdminMapper adminMapper;
    private final ProfileReviewService reviewService;

    @Value("${daliantutor.token-secret}")
    private String secret;

    @Value("${daliantutor.token-ttl-hours:168}")
    private long ttlHours;

    public AuthController(TeacherMapper teacherMapper, StudentMapper studentMapper,
                          AdminMapper adminMapper, ProfileReviewService reviewService) {
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.adminMapper = adminMapper;
        this.reviewService = reviewService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody Map<String, String> params) {
        String phone = params.get("phone");
        String password = params.get("password");
        String role = params.get("role");
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            throw new BizException("手机号和密码不能为空");
        }
        Map<String, Object> r = new java.util.LinkedHashMap<>();
        switch (role == null ? "" : role) {
            case "teacher" -> {
                Teacher t = teacherMapper.findByPhone(phone);
                if (t == null || !PasswordUtil.matches(password, t.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                if (t.getStatus() != null && t.getStatus() == -1) {
                    throw new BizException("账号正在等待管理员审核，暂不可登录");
                }
                r.put("token", TokenUtil.issue(t.getId(), "teacher", ttlHours, secret));
                r.put("id", t.getId());
                r.put("nickname", t.getNickname());
                r.put("role", "teacher");
                r.put("phone", t.getPhone());
                r.put("status", t.getStatus());
            }
            case "student" -> {
                Student s = studentMapper.findByPhone(phone);
                if (s == null || !PasswordUtil.matches(password, s.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                if (s.getStatus() != null && s.getStatus() == -1) {
                    throw new BizException("账号正在等待管理员审核，暂不可登录");
                }
                r.put("token", TokenUtil.issue(s.getId(), "student", ttlHours, secret));
                r.put("id", s.getId());
                r.put("nickname", s.getNickname());
                r.put("role", "student");
                r.put("phone", s.getPhone());
                r.put("status", s.getStatus());
            }
            case "admin" -> {
                Admin a = adminMapper.findByPhone(phone);
                if (a == null || !PasswordUtil.matches(password, a.getPassword())) {
                    throw new BizException("手机号或密码错误");
                }
                r.put("token", TokenUtil.issue(a.getId(), "admin", ttlHours, secret));
                r.put("id", a.getId());
                r.put("nickname", a.getNickname());
                r.put("role", "admin");
                r.put("phone", a.getPhone());
                r.put("isSuper", a.getIsSuper());
            }
            default -> throw new BizException("角色不合法");
        }
        return ApiResponse.ok(r);
    }

    /**
     * 入驻注册：校验滑块 token -> 检查手机号唯一 -> 创建账号(status=1 未激活) ->
     * 提交个人信息审核请求(requestLog type 0/1, json.kind=register)。
     */
    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@RequestBody com.daliantutor.dto.RegisterParams p) {
        // 滑块验证（防 ddos）
        reviewService.verifyCaptcha(p.getCaptchaToken());
        validate(p);
        int type = "teacher".equals(p.getRole()) ? ProfileReviewService.TYPE_TEACHER : ProfileReviewService.TYPE_STUDENT;

        // 手机号唯一（跨教师/学生表检查）
        if (teacherMapper.findByPhone(p.getPhone()) != null || studentMapper.findByPhone(p.getPhone()) != null) {
            throw new BizException("该手机号已注册，请直接登录");
        }

        // 创建账号：status=-1（待审核：不可登录、不可接单、不上池）；管理员 approve 后置 0
        String passwordHash = PasswordUtil.encode(p.getPassword());
        Integer accountId;
        if (type == ProfileReviewService.TYPE_TEACHER) {
            Teacher t = new Teacher();
            t.setNickname(p.getNickname());
            t.setPassword(passwordHash);
            t.setPhone(p.getPhone());
            t.setAge(p.getAge());
            t.setGender(p.getGender());
            t.setCredit(100);
            t.setGrade(p.getGrade());
            t.setSubject(p.getSubject());
            t.setDescription(p.getDescription());
            t.setAddress(p.getAddress());
            t.setStatus(-1);
            t.setTimeTable1(p.getTimeTable1());
            t.setTimeTable2(p.getTimeTable2());
            t.setTimeTable3(p.getTimeTable3());
            t.setTimeTable4(p.getTimeTable4());
            t.setTimeTable5(p.getTimeTable5());
            t.setTimeTable6(p.getTimeTable6());
            t.setTimeTable7(p.getTimeTable7());
            t.setQrcode(p.getQrcode());
            t.setIdcard(p.getIdcard());
            t.setCertificate(p.getCertificate());
            teacherMapper.insert(t);
            accountId = t.getId();
        } else {
            Student s = new Student();
            s.setNickname(p.getNickname());
            s.setPassword(passwordHash);
            s.setPhone(p.getPhone());
            s.setAge(p.getAge());
            s.setGender(p.getGender());
            s.setCredit(100);
            s.setGrade(p.getGrade());
            s.setSubject(p.getSubject());
            s.setDescription(p.getDescription());
            s.setAddress(p.getAddress());
            s.setStatus(-1);
            s.setTimeTable1(p.getTimeTable1());
            s.setTimeTable2(p.getTimeTable2());
            s.setTimeTable3(p.getTimeTable3());
            s.setTimeTable4(p.getTimeTable4());
            s.setTimeTable5(p.getTimeTable5());
            s.setTimeTable6(p.getTimeTable6());
            s.setTimeTable7(p.getTimeTable7());
            s.setQrcode(p.getQrcode());
            s.setIdcard(p.getIdcard());
            studentMapper.insert(s);
            accountId = s.getId();
        }

        // 提交入驻审核请求（json 不含密码，仅资料）；管理员 approve 后 status -1 -> 0
        Map<String, Object> profile = new java.util.LinkedHashMap<>();
        profile.put("nickname", p.getNickname());
        profile.put("phone", p.getPhone());
        profile.put("age", p.getAge());
        profile.put("gender", p.getGender());
        profile.put("grade", p.getGrade());
        profile.put("subject", p.getSubject());
        profile.put("description", p.getDescription());
        profile.put("address", p.getAddress());
        profile.put("timeTable1", p.getTimeTable1());
        profile.put("timeTable2", p.getTimeTable2());
        profile.put("timeTable3", p.getTimeTable3());
        profile.put("timeTable4", p.getTimeTable4());
        profile.put("timeTable5", p.getTimeTable5());
        profile.put("timeTable6", p.getTimeTable6());
        profile.put("timeTable7", p.getTimeTable7());
        profile.put("qrcode", p.getQrcode());
        profile.put("idcard", p.getIdcard());
        profile.put("certificate", p.getCertificate());
        reviewService.submitRegister(type, accountId, p.getNickname(), profile);

        Map<String, Object> r = new java.util.LinkedHashMap<>();
        r.put("accountId", accountId);
        r.put("status", -1);
        r.put("message", "注册申请已提交，请等待平台管理员审核通过后使用");
        return ApiResponse.ok(r);
    }

    private void validate(com.daliantutor.dto.RegisterParams p) {
        if (!"teacher".equals(p.getRole()) && !"student".equals(p.getRole())) {
            throw new BizException("角色不合法");
        }
        if (p.getNickname() == null || p.getNickname().isBlank()) throw new BizException("请填写昵称");
        if (p.getPassword() == null || p.getPassword().length() < 6) throw new BizException("密码至少 6 位");
        if (p.getPhone() == null || !p.getPhone().matches("\\d{11}")) throw new BizException("请填写 11 位手机号");
        if (p.getQrcode() == null || p.getQrcode().isBlank()) throw new BizException("请上传收款码截图");
        if (p.getIdcard() == null || p.getIdcard().isBlank()) throw new BizException("请上传身份证人像面");
    }
}
