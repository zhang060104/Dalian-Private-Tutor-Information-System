package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.dto.*;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.RequestLog;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.OrderMapper;
import com.daliantutor.mapper.RequestLogMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.daliantutor.service.ProfileReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 订单全流程（状态机 0~12）：
 *   0 教师投递待学生确认 | 1 学生指派待教师确认 | 2 双方确认进入明细确认程序
 *   3 学生改明细待教师审 | 4 教师改明细待学生审 | 5 缴费核验（管理员）
 *   6 试课中 | 7 学生试课通过待教师 | 8 教师试课通过待学生 | 9 授课中
 *   10 教师结单待学生 | 11 学生结单待教师 | 12 已结束
 * 规则：0/1 被拒或超 24h -> 物理删除（00:00 定时清理）；2 及以后取消/结束 -> 12 保留记录。
 * 联系方式（电话/地址）在 status>=6 时才向对方展示；infoFeeQR 仅供教师端缴费期查看。
 */
@RestController
@RequestMapping("/api/order")
public class OrderController {

    private final OrderMapper orderMapper;
    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final RequestLogMapper requestLogMapper;
    private final ProfileReviewService reviewService;
    private final ObjectMapper objectMapper;

    public OrderController(OrderMapper orderMapper, TeacherMapper teacherMapper, StudentMapper studentMapper,
                           RequestLogMapper requestLogMapper, ProfileReviewService reviewService,
                           ObjectMapper objectMapper) {
        this.orderMapper = orderMapper;
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.requestLogMapper = requestLogMapper;
        this.reviewService = reviewService;
        this.objectMapper = objectMapper;
    }

    // ==================== 发起 / 简历阶段（status 0/1） ====================

    /**
     * 发起订单：教师对学生投递简历(->0) 或 学生对教师免费试课指派(->1)。
     * 初始化明细：subject=学生需求科目；时间表=学生∩教师可授时间；时薪默认 0 待议。
     */
    @PostMapping("/apply")
    public ApiResponse<Map<String, Object>> apply(@RequestBody OrderApplyParams p,
                                                  @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                  @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        reviewService.verifyCaptcha(p.getCaptchaToken());
        if (p.getTargetId() == null) throw new BizException("缺少目标用户 id");
        int me = Integer.parseInt(userId);
        int studentId, teacherId, status;
        if ("teacher".equals(role)) {
            teacherId = me;
            studentId = p.getTargetId();
            status = 0; // 教师投递简历
        } else if ("student".equals(role)) {
            studentId = me;
            teacherId = p.getTargetId();
            status = 1; // 学生指派/免费试课
        } else {
            throw new BizException("只有教师/学生可以发起订单");
        }
        Student student = studentMapper.findById(studentId);
        Teacher teacher = teacherMapper.findById(teacherId);
        if (student == null || teacher == null) throw new BizException("对方账号不存在");
        if (student.getStatus() != 0) throw new BizException("对方当前未在寻找老师");
        if (teacher.getStatus() != 0) throw new BizException("对方当前未在寻找学生");
        if (orderMapper.findActive(studentId, teacherId) != null) {
            throw new BizException("你们已有进行中的订单，请勿重复发起");
        }

        Order order = new Order();
        order.setStudentId(studentId);
        order.setTeacherId(teacherId);
        order.setSubject(student.getSubject());
        order.setHourlyWage(0);
        order.setStatus(status);
        order.setVerification(0);
        order.setInfoFee(0);
        order.setTimeTable1(student.getTimeTable1() & teacher.getTimeTable1());
        order.setTimeTable2(student.getTimeTable2() & teacher.getTimeTable2());
        order.setTimeTable3(student.getTimeTable3() & teacher.getTimeTable3());
        order.setTimeTable4(student.getTimeTable4() & teacher.getTimeTable4());
        order.setTimeTable5(student.getTimeTable5() & teacher.getTimeTable5());
        order.setTimeTable6(student.getTimeTable6() & teacher.getTimeTable6());
        order.setTimeTable7(student.getTimeTable7() & teacher.getTimeTable7());
        orderMapper.insert(order);
        return ApiResponse.ok(detailMap(order.getId(), role, me));
    }

    /** 确认对方（status 0 学生确认教师投递 / status 1 教师确认学生指派）-> 2 */
    @PostMapping("/{id}/confirm")
    public ApiResponse<Map<String, Object>> confirm(@PathVariable Integer id,
                                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                    @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        if (o.getStatus() == 0) {
            requireRole(role, "student");
            if (me != o.getStudentId()) throw new BizException("只有学生可以确认");
            o.setStatus(2);
        } else if (o.getStatus() == 1) {
            requireRole(role, "teacher");
            if (me != o.getTeacherId()) throw new BizException("只有教师可以确认");
            o.setStatus(2);
        } else {
            throw new BizException("当前状态无需确认");
        }
        orderMapper.updateStatus(id, o.getStatus());
        return ApiResponse.ok(detailMap(id, role, me));
    }

    /** 拒绝对方简历/指派（status 0/1）-> 物理删除订单 */
    @PostMapping("/{id}/reject")
    public ApiResponse<Void> reject(@PathVariable Integer id,
                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                    @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        if (o.getStatus() > 1) throw new BizException("已确认的订单请使用取消");
        if ("teacher".equals(role) && me != o.getTeacherId()) throw new BizException("无权操作");
        if ("student".equals(role) && me != o.getStudentId()) throw new BizException("无权操作");
        orderMapper.deleteById(id);
        return ApiResponse.ok();
    }

    /**
     * 取消/结束订单：
     *   status 0/1 发起方撤回 -> 物理删除；2~8 任一方取消/试课不满意 -> 12；9 授课中禁止直接取消（走结单/仲裁）
     */
    @PostMapping("/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancel(@PathVariable Integer id,
                                                   @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                   @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        int st = o.getStatus();
        if (st <= 1) {
            orderMapper.deleteById(id);
            return ApiResponse.ok();
        }
        if (st >= 9) throw new BizException("授课期间不可直接取消，请走结单或仲裁流程");
        orderMapper.updateStatus(id, 12);
        return ApiResponse.ok(detailMap(id, role, me));
    }

    // ==================== 明细确认（status 2/3/4） ====================

    /**
     * 提交订单明细（科目/时薪/时间表/说明）。
     * 学生提交 -> 3；教师提交 -> 4。status2 双方可提交；3 仅教师可改；4 仅学生可改。
     */
    @PutMapping("/{id}/detail")
    public ApiResponse<Map<String, Object>> updateDetail(@PathVariable Integer id,
                                                         @RequestBody OrderDetailParams d,
                                                         @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                         @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        int st = o.getStatus();
        boolean isStudent = "student".equals(role);   // 身份以 token 角色为准
        boolean isTeacher = "teacher".equals(role);
        if (st == 2) {
            // 双方均可提交
        } else if (st == 3) {
            if (!isTeacher) throw new BizException("等待教师审核，学生暂不能修改");
        } else if (st == 4) {
            if (!isStudent) throw new BizException("等待学生审核，教师暂不能修改");
        } else {
            throw new BizException("当前状态不允许修改订单信息");
        }
        if (d.getSubject() == null || d.getSubject() == 0) throw new BizException("请选择授课科目");
        if (d.getHourlyWage() == null || d.getHourlyWage() <= 0) throw new BizException("请填写授课时薪（元/小时）");

        o.setSubject(d.getSubject());
        o.setHourlyWage(d.getHourlyWage());
        o.setDescription(d.getDescription());
        o.setTimeTable1(d.getTimeTable1());
        o.setTimeTable2(d.getTimeTable2());
        o.setTimeTable3(d.getTimeTable3());
        o.setTimeTable4(d.getTimeTable4());
        o.setTimeTable5(d.getTimeTable5());
        o.setTimeTable6(d.getTimeTable6());
        o.setTimeTable7(d.getTimeTable7());
        orderMapper.updateDetail(o);

        int next = isStudent ? 3 : 4; // 学生提交 -> 等教师审(3)；教师提交 -> 等学生审(4)
        orderMapper.updateStatus(id, next);
        return ApiResponse.ok(detailMap(id, role, me));
    }

    /** 确认对方提交的明细 -> 5（进入缴费）。status3 教师确认；status4 学生确认。同时计算信息费。 */
    @PostMapping("/{id}/confirm-detail")
    public ApiResponse<Map<String, Object>> confirmDetail(@PathVariable Integer id,
                                                          @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                          @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        int st = o.getStatus();
        if (st == 3) {
            requireRole(role, "teacher");
            if (me != o.getTeacherId()) throw new BizException("只有教师可以确认");
        } else if (st == 4) {
            requireRole(role, "student");
            if (me != o.getStudentId()) throw new BizException("只有学生可以确认");
        } else {
            throw new BizException("当前状态不能确认订单信息");
        }
        // 计算信息费 = 时薪 x 每周总课时（timeTable1..7 popcount 之和），进入缴费前锁定
        int weeklyHours = Integer.bitCount(nvl(o.getTimeTable1())) + Integer.bitCount(nvl(o.getTimeTable2()))
                + Integer.bitCount(nvl(o.getTimeTable3())) + Integer.bitCount(nvl(o.getTimeTable4()))
                + Integer.bitCount(nvl(o.getTimeTable5())) + Integer.bitCount(nvl(o.getTimeTable6()))
                + Integer.bitCount(nvl(o.getTimeTable7()));
        int infoFee = nvl(o.getHourlyWage()) * weeklyHours;
        orderMapper.updateInfoFee(id, infoFee);
        orderMapper.updateStatus(id, 5);
        return ApiResponse.ok(detailMap(id, role, me));
    }

    // ==================== 缴费（status 5） ====================

    /**
     * 上传支付截图（教师定金 depositTea / 学生定金 depositStu / 教师信息费 infoFee），
     * 生成 requestLog type 2/3/4 等待管理员核验。同一类型存在未处理请求时不可重复提交。
     */
    @PostMapping("/{id}/payment")
    public ApiResponse<Void> uploadPayment(@PathVariable Integer id,
                                           @RequestBody PaymentParams p,
                                           @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                           @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        if (o.getStatus() != 5) throw new BizException("当前不在缴费阶段");
        if (p.getImageUrl() == null || p.getImageUrl().isBlank()) throw new BizException("请上传支付截图");
        if (p.getType() == null) throw new BizException("缺少缴费类型");

        int reqType;
        switch (p.getType()) {
            case "depositTea" -> {
                if (!"teacher".equals(role) || me != o.getTeacherId()) throw new BizException("教师定金需教师本人上传");
                orderMapper.updateDepositImgTea(id, p.getImageUrl());
                reqType = 2;
            }
            case "depositStu" -> {
                if (!"student".equals(role) || me != o.getStudentId()) throw new BizException("学生定金需学生本人上传");
                orderMapper.updateDepositImgStu(id, p.getImageUrl());
                reqType = 3;
            }
            case "infoFee" -> {
                if (!"teacher".equals(role) || me != o.getTeacherId()) throw new BizException("信息费需教师本人上传");
                orderMapper.updateInfoFeeImg(id, p.getImageUrl());
                reqType = 4;
            }
            default -> throw new BizException("缴费类型不合法");
        }
        // 防重复：同订单同类型存在未处理请求
        List<RequestLog> pendings = requestLogMapper.selectByType(reqType, true);
        for (RequestLog log : pendings) {
            if (Integer.valueOf(o.getId()).equals(log.getTarId())) {
                throw new BizException("已有待核验的缴费凭证，请等待管理员处理");
            }
        }
        RequestLog log = new RequestLog();
        log.setType(reqType);
        log.setTarId(id);
        log.setAdminId(-1);
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("kind", "payment");
        json.put("payType", p.getType());
        json.put("orderId", id);
        json.put("imageUrl", p.getImageUrl());
        json.put("submittedAt", LocalDateTime.now().toString());
        log.setJson(writeJson(json));
        requestLogMapper.insert(log);
        return ApiResponse.ok();
    }

    // ==================== 试课（status 6/7/8） ====================

    /** 试课通过：6 学生点->7 / 教师点->8；7 教师再点->9；8 学生再点->9 */
    @PostMapping("/{id}/trial-pass")
    public ApiResponse<Map<String, Object>> trialPass(@PathVariable Integer id,
                                                      @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                      @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        int st = o.getStatus();
        boolean isStudent = "student".equals(role);
        int next;
        if (st == 6) {
            next = isStudent ? 7 : 8;
        } else if (st == 7) {
            if (isStudent) throw new BizException("你已通过试课，等待教师确认");
            next = 9;
        } else if (st == 8) {
            if (!isStudent) throw new BizException("你已通过试课，等待学生确认");
            next = 9;
        } else {
            throw new BizException("当前不在试课阶段");
        }
        orderMapper.updateStatus(id, next);
        return ApiResponse.ok(detailMap(id, role, me));
    }

    // ==================== 结单（status 9/10/11） ====================

    /** 结单：9 教师点->10 / 学生点->11；10 学生点->12；11 教师点->12 */
    @PostMapping("/{id}/settle")
    public ApiResponse<Map<String, Object>> settle(@PathVariable Integer id,
                                                   @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                   @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        int st = o.getStatus();
        boolean isStudent = "student".equals(role);
        int next;
        if (st == 9) {
            next = isStudent ? 11 : 10;
        } else if (st == 10) {
            if (!isStudent) throw new BizException("等待学生同意结单");
            next = 12;
        } else if (st == 11) {
            if (isStudent) throw new BizException("等待教师同意结单");
            next = 12;
        } else {
            throw new BizException("当前状态不能结单");
        }
        orderMapper.updateStatus(id, next);
        return ApiResponse.ok(detailMap(id, role, me));
    }

    // ==================== 仲裁（status 9） ====================

    /** 授课期间申请订单毁约仲裁 -> requestLog type 5 */
    @PostMapping("/{id}/arbitrate")
    public ApiResponse<Void> arbitrate(@PathVariable Integer id,
                                       @RequestBody ArbitrateParams p,
                                       @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                       @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        Order o = getOrder(id);
        int me = Integer.parseInt(userId);
        checkParticipant(o, role, me);
        if (o.getStatus() != 9) throw new BizException("仅在授课期间可申请仲裁");
        if ((p.getText() == null || p.getText().isBlank()) && (p.getImages() == null || p.getImages().isEmpty())) {
            throw new BizException("请填写仲裁描述或上传证据图片");
        }
        RequestLog log = new RequestLog();
        log.setType(5);
        log.setTarId(id);
        log.setAdminId(-1);
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("kind", "arbitrate");
        json.put("orderId", id);
        json.put("text", p.getText());
        json.put("images", p.getImages() == null ? List.of() : p.getImages());
        json.put("submittedAt", LocalDateTime.now().toString());
        log.setJson(writeJson(json));
        requestLogMapper.insert(log);
        return ApiResponse.ok();
    }

    // ==================== 查询 ====================

    /** 我的订单列表（含对方昵称）。?scope=all 含已结束 */
    @GetMapping("/mine")
    public ApiResponse<List<Map<String, Object>>> mine(@RequestParam(defaultValue = "active") String scope,
                                                        @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                        @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int me = Integer.parseInt(userId);
        List<Order> orders = "teacher".equals(role) ? orderMapper.selectByTeacher(me)
                : "student".equals(role) ? orderMapper.selectByStudent(me)
                : List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Order o : orders) {
            if ("active".equals(scope) && o.getStatus() == 12) continue;
            out.add(publicMap(o, role, me, false));
        }
        return ApiResponse.ok(out);
    }

    /** 订单详情（双方/管理员可见；对方联系方式在 status>=6 才返回） */
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable Integer id,
                                                   @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
                                                   @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int me = Integer.parseInt(userId);
        getOrder(id); // 校验存在
        return ApiResponse.ok(detailMap(id, role, me));
    }

    // ==================== 内部 ====================

    private Map<String, Object> detailMap(Integer id, String role, int me) {
        return publicMap(getOrder(id), role, me, true);
    }

    /** 组装订单视图；full=true 时附带对方联系方式（status>=6）与缴费二维码（教师端 status5） */
    private Map<String, Object> publicMap(Order o, String role, int me, boolean full) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("studentId", o.getStudentId());
        m.put("teacherId", o.getTeacherId());
        m.put("subject", o.getSubject());
        m.put("hourlyWage", o.getHourlyWage());
        m.put("description", o.getDescription());
        m.put("status", o.getStatus());
        m.put("verification", o.getVerification());
        m.put("infoFee", o.getInfoFee());
        m.put("timeTable1", o.getTimeTable1());
        m.put("timeTable2", o.getTimeTable2());
        m.put("timeTable3", o.getTimeTable3());
        m.put("timeTable4", o.getTimeTable4());
        m.put("timeTable5", o.getTimeTable5());
        m.put("timeTable6", o.getTimeTable6());
        m.put("timeTable7", o.getTimeTable7());
        m.put("createdAt", o.getCreatedAt());
        m.put("updatedAt", o.getUpdatedAt());

        Teacher t = teacherMapper.findById(o.getTeacherId());
        Student s = studentMapper.findById(o.getStudentId());
        m.put("teacherName", t == null ? null : t.getNickname());
        m.put("studentName", s == null ? null : s.getNickname());
        m.put("teacherCredit", t == null ? null : t.getCredit());
        m.put("studentCredit", s == null ? null : s.getCredit());

        boolean isTeacher = "teacher".equals(role) && me == o.getTeacherId();
        boolean isStudent = "student".equals(role) && me == o.getStudentId();
        boolean isAdmin = "admin".equals(role);
        boolean participant = isTeacher || isStudent;

        if (!full || !participant && !isAdmin) {
            return m; // 列表视图：不带联系方式
        }
        // 详情视图：管理员全可见；双方在 status>=6（核验完成进入试课）可见对方电话/地址
        boolean contactVisible = isAdmin || o.getStatus() >= 6;
        if (isTeacher || isAdmin) {
            m.put("studentPhone", contactVisible && s != null ? s.getPhone() : null);
            m.put("studentAddress", contactVisible && s != null ? s.getAddress() : null);
        }
        if (isStudent || isAdmin) {
            m.put("teacherPhone", contactVisible && t != null ? t.getPhone() : null);
            m.put("teacherAddress", contactVisible && t != null ? t.getAddress() : null);
        }
        // 信息费收款码：教师端在缴费期（status5 及之后）查看，管理员始终可见
        if ((isTeacher && o.getStatus() >= 5) || isAdmin) {
            m.put("infoFeeQr", o.getInfoFeeQr());
        }
        // 本人支付凭证回显（缴费阶段确认自己传的截图）
        if (isTeacher || isAdmin) m.put("depositImgTea", o.getDepositImgTea());
        if (isStudent || isAdmin) m.put("depositImgStu", o.getDepositImgStu());
        if (isTeacher || isAdmin) m.put("infoFeeImg", o.getInfoFeeImg());
        return m;
    }

    private Order getOrder(Integer id) {
        Order o = orderMapper.findById(id);
        if (o == null) throw new BizException("订单不存在");
        return o;
    }

    private void checkParticipant(Order o, String role, int me) {
        if ("teacher".equals(role) && me == o.getTeacherId()) return;
        if ("student".equals(role) && me == o.getStudentId()) return;
        throw new BizException("无权操作该订单");
    }

    private void requireRole(String role, String expected) {
        if (!expected.equals(role)) throw new BizException("操作角色不符");
    }

    private int nvl(Integer v) {
        return v == null ? 0 : v;
    }

    private String writeJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            throw new BizException("数据序列化失败");
        }
    }
}
