package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.dto.RegisterParams;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.util.PasswordUtil;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 老师：入驻注册、老师列表（学生看）、我的资料
 */
@RestController
@RequestMapping("/api")
public class TeacherController {

    private final TeacherMapper teacherMapper;

    public TeacherController(TeacherMapper teacherMapper) {
        this.teacherMapper = teacherMapper;
    }

    @PostMapping("/teacher/register")
    public ApiResponse<Teacher> register(@RequestBody RegisterParams p) {
        validate(p);
        if (teacherMapper.findByPhone(p.getPhone()) != null) {
            throw new BizException("该手机号已注册，请直接登录");
        }
        Teacher t = new Teacher();
        t.setNickname(p.getNickname());
        t.setPassword(PasswordUtil.encode(p.getPassword()));
        t.setPhone(p.getPhone());
        t.setAge(p.getAge());
        t.setGender(p.getGender());
        t.setCredit(100);
        t.setGrade(p.getGrade());
        t.setSubject(p.getSubject());
        t.setDescription(p.getDescription());
        t.setStatus(0);
        copyTimetable(p, t);
        teacherMapper.insert(t);
        t.setPassword(null);
        return ApiResponse.ok(t);
    }

    /** 老师列表（学生选老师用） */
    @GetMapping("/teachers")
    public ApiResponse<List<Teacher>> teachers() {
        List<Teacher> list = teacherMapper.selectAvailable();
        list.forEach(t -> t.setPassword(null));
        return ApiResponse.ok(list);
    }

    /** 我的资料 */
    @GetMapping("/teacher/me")
    public ApiResponse<Teacher> me(@RequestAttribute("authUserId") String userId) {
        Teacher t = teacherMapper.findById(Integer.parseInt(userId));
        if (t == null) {
            throw new BizException("账号不存在");
        }
        t.setPassword(null);
        return ApiResponse.ok(t);
    }

    private void validate(RegisterParams p) {
        if (p.getNickname() == null || p.getNickname().isBlank()) throw new BizException("请填写姓名");
        if (p.getPassword() == null || p.getPassword().length() < 6) throw new BizException("密码至少 6 位");
        if (p.getPhone() == null || !p.getPhone().matches("\\d{11}")) throw new BizException("请填写 11 位手机号");
    }

    private void copyTimetable(RegisterParams p, Teacher t) {
        t.setTimeTable1(p.getTimeTable1());
        t.setTimeTable2(p.getTimeTable2());
        t.setTimeTable3(p.getTimeTable3());
        t.setTimeTable4(p.getTimeTable4());
        t.setTimeTable5(p.getTimeTable5());
        t.setTimeTable6(p.getTimeTable6());
        t.setTimeTable7(p.getTimeTable7());
    }
}
