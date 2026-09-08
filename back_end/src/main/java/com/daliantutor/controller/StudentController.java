package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.dto.RegisterParams;
import com.daliantutor.entity.Student;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.util.PasswordUtil;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 学生：入驻注册、学生列表（老师看）、我的资料
 */
@RestController
@RequestMapping("/api")
public class StudentController {

    private final StudentMapper studentMapper;

    public StudentController(StudentMapper studentMapper) {
        this.studentMapper = studentMapper;
    }

    @PostMapping("/student/register")
    public ApiResponse<Student> register(@RequestBody RegisterParams p) {
        validate(p);
        if (studentMapper.findByPhone(p.getPhone()) != null) {
            throw new BizException("该手机号已注册，请直接登录");
        }
        Student s = new Student();
        s.setNickname(p.getNickname());
        s.setPassword(PasswordUtil.encode(p.getPassword()));
        s.setPhone(p.getPhone());
        s.setAge(p.getAge());
        s.setGender(p.getGender());
        s.setCredit(100);
        s.setGrade(p.getGrade());
        s.setSubject(p.getSubject());
        s.setDescription(p.getDescription());
        s.setAddress(p.getAddress());
        s.setStatus(0);
        copyTimetable(p, s);
        studentMapper.insert(s);
        s.setPassword(null);
        return ApiResponse.ok(s);
    }

    /** 学生列表（老师选学生用） */
    @GetMapping("/students")
    public ApiResponse<List<Student>> students() {
        List<Student> list = studentMapper.selectAvailable();
        list.forEach(s -> s.setPassword(null));
        return ApiResponse.ok(list);
    }

    /** 我的资料 */
    @GetMapping("/student/me")
    public ApiResponse<Student> me(@RequestAttribute("authUserId") String userId) {
        Student s = studentMapper.findById(Integer.parseInt(userId));
        if (s == null) {
            throw new BizException("账号不存在");
        }
        s.setPassword(null);
        return ApiResponse.ok(s);
    }

    private void validate(RegisterParams p) {
        if (p.getNickname() == null || p.getNickname().isBlank()) throw new BizException("请填写姓名");
        if (p.getPassword() == null || p.getPassword().length() < 6) throw new BizException("密码至少 6 位");
        if (p.getPhone() == null || !p.getPhone().matches("\\d{11}")) throw new BizException("请填写 11 位手机号");
    }

    private void copyTimetable(RegisterParams p, Student s) {
        s.setTimeTable1(p.getTimeTable1());
        s.setTimeTable2(p.getTimeTable2());
        s.setTimeTable3(p.getTimeTable3());
        s.setTimeTable4(p.getTimeTable4());
        s.setTimeTable5(p.getTimeTable5());
        s.setTimeTable6(p.getTimeTable6());
        s.setTimeTable7(p.getTimeTable7());
    }
}
