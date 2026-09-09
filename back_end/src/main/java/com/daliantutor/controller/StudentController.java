package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.dto.ProfileReviewSubmit;
import com.daliantutor.dto.ProfileReviewVO;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.Student;
import com.daliantutor.mapper.OrderMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.service.ProfileReviewService;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 学生端：列表池（教师浏览学生）、个人主页（本人=全量+进行中订单，他人=脱敏公开）、
 * 资料修改审核入口。
 */
@RestController
@RequestMapping("/api")
public class StudentController {

    private final StudentMapper studentMapper;
    private final OrderMapper orderMapper;
    private final ProfileReviewService reviewService;

    public StudentController(StudentMapper studentMapper, OrderMapper orderMapper,
                             ProfileReviewService reviewService) {
        this.studentMapper = studentMapper;
        this.orderMapper = orderMapper;
        this.reviewService = reviewService;
    }

    /** 学生池：教师投递简历用。仅 status=0；私密字段不下发 */
    @GetMapping("/students")
    public ApiResponse<List<Map<String, Object>>> students(@RequestParam(required = false) Integer subject,
                                                           @RequestParam(required = false) Integer grade,
                                                           @RequestParam(required = false) String gender,
                                                           @RequestParam(required = false) String keyword) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Student s : studentMapper.selectPool(subject, grade, gender, keyword)) {
            out.add(publicStudent(s));
        }
        return ApiResponse.ok(out);
    }

    /** 学生个人主页：本人=全量+进行中订单；他人=脱敏公开信息 */
    @GetMapping("/student/{id}")
    public ApiResponse<Map<String, Object>> profile(@PathVariable Integer id,
                                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                    @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Student s = studentMapper.findById(id);
        if (s == null) throw new BizException("学生不存在");
        boolean self = "student".equals(role) && Integer.parseInt(userId) == id;
        Map<String, Object> m = self ? fullStudent(s) : publicStudent(s);
        if (self) {
            List<Order> orders = orderMapper.selectActiveByUser("student", id);
            m.put("orders", orders);
        }
        return ApiResponse.ok(m);
    }

    /** 学生本人切换寻找状态（0 寻找中 / 1 停止），即时生效无需审核 */
    @PutMapping("/student/me/status")
    public ApiResponse<Void> updateStatus(@RequestBody Map<String, Integer> body,
                                          @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                          @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        if (!"student".equals(role)) throw new BizException("角色不符");
        int me = Integer.parseInt(userId);
        Integer status = body.get("status");
        if (status == null || (status != 0 && status != 1)) throw new BizException("status 仅可为 0/1");
        studentMapper.updateStatus(me, status);
        return ApiResponse.ok();
    }

    // ---------- 资料修改审核（学生） ----------

    /** 我的待审请求（无则 null） */
    @GetMapping("/profile/review/mine")
    public ApiResponse<ProfileReviewVO> mine(@RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                             @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int me = Integer.parseInt(userId);
        return ApiResponse.ok(reviewService.findMine(reviewService.typeOf(role), me));
    }

    /** 提交资料修改申请（需滑块验证码） */
    @PostMapping("/profile/review")
    public ApiResponse<ProfileReviewVO> submit(@RequestBody ProfileReviewSubmit body,
                                               @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                               @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        reviewService.verifyCaptcha(body.getCaptchaToken());
        int me = Integer.parseInt(userId);
        return ApiResponse.ok(reviewService.submit(reviewService.typeOf(role), me, body));
    }

    /** 撤回自己的待审申请 */
    @PostMapping("/profile/review/{id}/cancel")
    public ApiResponse<Void> cancel(@PathVariable Integer id,
                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                    @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int me = Integer.parseInt(userId);
        reviewService.cancel(id, reviewService.typeOf(role), me);
        return ApiResponse.ok();
    }

    /** 学生本人完整资料（登录后个人主页数据源） */
    @GetMapping("/student/me")
    public ApiResponse<Map<String, Object>> me(@RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                               @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        if (!"student".equals(role)) throw new BizException("角色不符");
        int me = Integer.parseInt(userId);
        Student s = studentMapper.findById(me);
        if (s == null) throw new BizException("账号不存在");
        Map<String, Object> m = fullStudent(s);
        m.put("orders", orderMapper.selectActiveByUser("student", me));
        m.put("review", reviewService.findMine(ProfileReviewService.TYPE_STUDENT, me));
        return ApiResponse.ok(m);
    }

    private Map<String, Object> publicStudent(Student s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("nickname", s.getNickname());
        m.put("age", s.getAge());
        m.put("gender", s.getGender());
        m.put("credit", s.getCredit());
        m.put("grade", s.getGrade());
        m.put("subject", s.getSubject());
        m.put("description", s.getDescription());
        m.put("status", s.getStatus());
        m.put("timeTable1", s.getTimeTable1());
        m.put("timeTable2", s.getTimeTable2());
        m.put("timeTable3", s.getTimeTable3());
        m.put("timeTable4", s.getTimeTable4());
        m.put("timeTable5", s.getTimeTable5());
        m.put("timeTable6", s.getTimeTable6());
        m.put("timeTable7", s.getTimeTable7());
        return m;
    }

    private Map<String, Object> fullStudent(Student s) {
        Map<String, Object> m = publicStudent(s);
        m.put("phone", s.getPhone());
        m.put("address", s.getAddress());
        m.put("qrcode", s.getQrcode());
        m.put("idcard", s.getIdcard());
        return m;
    }
}
