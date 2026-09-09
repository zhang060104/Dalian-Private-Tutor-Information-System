package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.OrderMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.service.ProfileReviewService;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 教师端：列表池（学生浏览教师）、个人主页（本人=全量+进行中订单，他人=脱敏公开）
 */
@RestController
@RequestMapping("/api")
public class TeacherController {

    private final TeacherMapper teacherMapper;
    private final OrderMapper orderMapper;
    private final ProfileReviewService reviewService;

    public TeacherController(TeacherMapper teacherMapper, OrderMapper orderMapper,
                             ProfileReviewService reviewService) {
        this.teacherMapper = teacherMapper;
        this.orderMapper = orderMapper;
        this.reviewService = reviewService;
    }

    /** 教师池：学生免费试课指派用。仅 status=0；私密字段不下发 */
    @GetMapping("/teachers")
    public ApiResponse<List<Map<String, Object>>> teachers(@RequestParam(required = false) Integer subject,
                                                           @RequestParam(required = false) Integer grade,
                                                           @RequestParam(required = false) String gender,
                                                           @RequestParam(required = false) String keyword) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Teacher t : teacherMapper.selectPool(subject, grade, gender, keyword)) {
            out.add(publicTeacher(t));
        }
        return ApiResponse.ok(out);
    }

    /** 教师个人主页 */
    @GetMapping("/teacher/{id}")
    public ApiResponse<Map<String, Object>> profile(@PathVariable Integer id,
                                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                    @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Teacher t = teacherMapper.findById(id);
        if (t == null) throw new BizException("教师不存在");
        boolean self = "teacher".equals(role) && Integer.parseInt(userId) == id;
        Map<String, Object> m = self ? fullTeacher(t) : publicTeacher(t);
        m.put("isMe", self);
        if (self) {
            m.put("orders", orderMapper.selectActiveByUser("teacher", id));
        }
        return ApiResponse.ok(m);
    }

    /** 教师本人切换寻找状态（0 寻找中 / 1 停止） */
    @PutMapping("/teacher/me/status")
    public ApiResponse<Void> updateStatus(@RequestBody Map<String, Integer> body,
                                          @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                          @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        if (!"teacher".equals(role)) throw new BizException("角色不符");
        int me = Integer.parseInt(userId);
        Integer status = body.get("status");
        if (status == null || (status != 0 && status != 1)) throw new BizException("status 仅可为 0/1");
        teacherMapper.updateStatus(me, status);
        return ApiResponse.ok();
    }

    /** 教师本人完整资料 */
    @GetMapping("/teacher/me")
    public ApiResponse<Map<String, Object>> me(@RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                               @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        if (!"teacher".equals(role)) throw new BizException("角色不符");
        int me = Integer.parseInt(userId);
        Teacher t = teacherMapper.findById(me);
        if (t == null) throw new BizException("账号不存在");
        Map<String, Object> m = fullTeacher(t);
        m.put("isMe", true);
        m.put("orders", orderMapper.selectActiveByUser("teacher", me));
        m.put("review", reviewService.findMine(ProfileReviewService.TYPE_TEACHER, me));
        return ApiResponse.ok(m);
    }

    private Map<String, Object> publicTeacher(Teacher t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("nickname", t.getNickname());
        m.put("age", t.getAge());
        m.put("gender", t.getGender());
        m.put("credit", t.getCredit());
        m.put("grade", t.getGrade());
        m.put("subject", t.getSubject());
        m.put("description", t.getDescription());
        m.put("status", t.getStatus());
        m.put("timeTable1", t.getTimeTable1());
        m.put("timeTable2", t.getTimeTable2());
        m.put("timeTable3", t.getTimeTable3());
        m.put("timeTable4", t.getTimeTable4());
        m.put("timeTable5", t.getTimeTable5());
        m.put("timeTable6", t.getTimeTable6());
        m.put("timeTable7", t.getTimeTable7());
        return m;
    }

    private Map<String, Object> fullTeacher(Teacher t) {
        Map<String, Object> m = publicTeacher(t);
        m.put("phone", t.getPhone());
        m.put("address", t.getAddress());
        m.put("qrcode", t.getQrcode());
        m.put("idcard", t.getIdcard());
        m.put("certificate", t.getCertificate());
        return m;
    }
}
