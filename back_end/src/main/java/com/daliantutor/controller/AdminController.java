package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.entity.Admin;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.RequestLog;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.*;
import com.daliantutor.service.ProfileReviewService;
import com.daliantutor.util.PasswordUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 管理员后台（/api/admin/**，仅 admin 角色可访问）：
 * 统计、师生/订单全量列表、requestLog 审核（注册入驻/资料修改/缴费核验/仲裁）、
 * 信息费收款码上传、信用分调整、管理员管理（仅超管可增删，id=0 不可删）。
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final OrderMapper orderMapper;
    private final RequestLogMapper requestLogMapper;
    private final AdminMapper adminMapper;
    private final ProfileReviewService reviewService;
    private final ObjectMapper objectMapper;

    public AdminController(TeacherMapper teacherMapper, StudentMapper studentMapper,
                           OrderMapper orderMapper, RequestLogMapper requestLogMapper,
                           AdminMapper adminMapper, ProfileReviewService reviewService,
                           ObjectMapper objectMapper) {
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.orderMapper = orderMapper;
        this.requestLogMapper = requestLogMapper;
        this.adminMapper = adminMapper;
        this.reviewService = reviewService;
        this.objectMapper = objectMapper;
    }

    /** 统计 */
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("teacherCount", teacherMapper.selectAll().size());
        r.put("studentCount", studentMapper.selectAll().size());
        r.put("orderCount", orderMapper.selectAll().size());
        r.put("pendingRequestCount", requestLogMapper.selectByType(-1, true).size());
        return ApiResponse.ok(r);
    }

    @GetMapping("/teachers")
    public ApiResponse<List<Teacher>> teachers() {
        List<Teacher> list = teacherMapper.selectAll();
        list.forEach(t -> t.setPassword(null));
        return ApiResponse.ok(list);
    }

    @GetMapping("/students")
    public ApiResponse<List<Student>> students() {
        List<Student> list = studentMapper.selectAll();
        list.forEach(s -> s.setPassword(null));
        return ApiResponse.ok(list);
    }

    /**
     * 用户完整档案（管理端）：基础资料全字段 + 订单统计 + 缴费凭证汇总 + 全部审核/操作记录。
     * 供「信用分管理 → 查看」页一页展示该用户所有数据。
     */
    @GetMapping("/users/{role}/{id}")
    public ApiResponse<Map<String, Object>> userArchive(@PathVariable String role, @PathVariable Integer id) {
        String r = normalizeRole(role);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("role", r);
        res.put("id", id);

        List<Order> orders;
        if ("teacher".equals(r)) {
            Teacher t = teacherMapper.findById(id);
            if (t == null) throw new BizException("用户不存在");
            t.setPassword(null);
            res.put("profile", t);
            orders = orderMapper.selectByTeacher(id);
        } else {
            Student s = studentMapper.findById(id);
            if (s == null) throw new BizException("用户不存在");
            s.setPassword(null);
            res.put("profile", s);
            orders = orderMapper.selectByStudent(id);
        }

        // 订单统计 + 缴费凭证汇总（含金额，便于管理员核对）
        Set<Integer> orderIds = new HashSet<>();
        int active = 0, closed = 0, infoFeeTotal = 0;
        List<Map<String, Object>> vouchers = new ArrayList<>();
        for (Order o : orders) {
            orderIds.add(o.getId());
            if (o.getStatus() != null && o.getStatus() == 12) closed++;
            else active++;
            if (o.getInfoFee() != null) infoFeeTotal += o.getInfoFee();

            Map<String, Object> v = new LinkedHashMap<>();
            v.put("orderId", o.getId());
            v.put("status", o.getStatus());
            v.put("verification", o.getVerification());
            v.put("hourlyWage", o.getHourlyWage());
            v.put("infoFee", o.getInfoFee());
            v.put("depositImgTea", o.getDepositImgTea());
            v.put("depositImgStu", o.getDepositImgStu());
            v.put("infoFeeImg", o.getInfoFeeImg());
            v.put("infoFeeQr", o.getInfoFeeQr());
            v.put("createdAt", o.getCreatedAt());
            vouchers.add(v);
        }
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("orderTotal", orders.size());
        stats.put("orderActive", active);
        stats.put("orderClosed", closed);
        stats.put("infoFeeTotal", infoFeeTotal);
        // 定金为平台固定金额（学生/教师双方各 100 元），与前端 utils/order.ts 的 DEPOSIT_AMOUNT 保持一致
        stats.put("depositAmount", 100);
        res.put("stats", stats);
        res.put("vouchers", vouchers);

        // 相关审核/操作记录：本人资料/入驻类（type 0/1，tarId = 本人 id）+ 其订单业务类（type 2~5，tarId = 订单 id）
        List<Map<String, Object>> logs = new ArrayList<>();
        for (RequestLog log : requestLogMapper.selectAll()) {
            Integer type = log.getType();
            if (type == null || log.getTarId() == null) continue;
            boolean mine = (type <= 1 && log.getTarId().equals(id))
                    || (type >= 2 && orderIds.contains(log.getTarId()));
            if (mine) logs.add(requestView(log));
        }
        res.put("logs", logs);
        return ApiResponse.ok(res);
    }

    @GetMapping("/orders")
    public ApiResponse<List<Map<String, Object>>> orders() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Order o : orderMapper.selectAll()) {
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
            m.put("depositImgTea", o.getDepositImgTea());
            m.put("depositImgStu", o.getDepositImgStu());
            m.put("infoFeeImg", o.getInfoFeeImg());
            m.put("infoFeeQr", o.getInfoFeeQr());
            Teacher t = teacherMapper.findById(o.getTeacherId());
            Student s = studentMapper.findById(o.getStudentId());
            m.put("teacherName", t == null ? null : t.getNickname());
            m.put("teacherPhone", t == null ? null : t.getPhone());
            m.put("teacherCredit", t == null ? null : t.getCredit());
            m.put("studentName", s == null ? null : s.getNickname());
            m.put("studentPhone", s == null ? null : s.getPhone());
            m.put("studentCredit", s == null ? null : s.getCredit());
            out.add(m);
        }
        return ApiResponse.ok(out);
    }

    /** requestLog 列表：?type=0..5&pending=true 仅待审 */
    @GetMapping("/requests")
    public ApiResponse<List<Map<String, Object>>> requests(@RequestParam(required = false) Integer type,
                                                           @RequestParam(defaultValue = "false") boolean pending) {
        List<RequestLog> logs = requestLogMapper.selectByType(type == null ? -1 : type, pending);
        List<Map<String, Object>> out = new ArrayList<>();
        for (RequestLog log : logs) {
            out.add(requestView(log));
        }
        return ApiResponse.ok(out);
    }

    /**
     * 审核处理（认领防并发：admin_id -1 -> 当前管理员；已处理则拒绝）。
     * approve=true 时执行落库动作；驳回仅标记。
     * 可选 profile：管理员手动修正后的最终资料（文档：可手动修改用户信息避免小细节反复不通过）。
     */
    @PostMapping("/requests/{id}/resolve")
    public ApiResponse<Map<String, Object>> resolve(@PathVariable Integer id,
                                                    @RequestBody Map<String, Object> body,
                                                    @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId) {
        boolean approve = body.get("approve") != null && Boolean.TRUE.equals(body.get("approve"));
        String note = body.get("note") == null ? null : String.valueOf(body.get("note"));
        @SuppressWarnings("unchecked")
        Map<String, Object> overrideProfile = body.get("profile") instanceof Map
                ? (Map<String, Object>) body.get("profile") : null;
        int adminId = Integer.parseInt(userId);

        RequestLog log = requestLogMapper.findById(id);
        if (log == null) throw new BizException("请求不存在");
        if (requestLogMapper.claim(id, adminId) == 0) {
            throw new BizException("该请求已被其他管理员处理");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("type", log.getType());
        switch (log.getType()) {
            case 0, 1 -> { // 入驻注册 / 资料修改（kind=register / update）
                Map<String, Object> payload = readPayload(log.getJson());
                String kind = payload == null ? "update" : String.valueOf(payload.getOrDefault("kind", "update"));
                if ("register".equals(kind)) {
                    if (approve) {
                        reviewService.approve(log, null);
                        result.put("action", "register approved -> 账号已激活");
                    } else {
                        result.put("action", "register rejected -> 账号保持未激活");
                    }
                } else {
                    if (approve) {
                        reviewService.approve(log, overrideProfile);
                        result.put("action", "profile update approved -> 已合并资料");
                    } else {
                        result.put("action", "profile update rejected");
                    }
                }
            }
            case 2, 3, 4 -> { // 缴费核验：定金（教师/学生）/ 信息费
                if (approve) {
                    Order o = orderMapper.findById(log.getTarId());
                    if (o == null) throw new BizException("关联订单不存在");
                    int bit = 1 << (log.getType() - 2); // type2->bit0 教师定金 type3->bit1 学生定金 type4->bit2 信息费
                    int verification = (o.getVerification() == null ? 0 : o.getVerification()) | bit;
                    orderMapper.updateVerification(o.getId(), verification);
                    // 三项费用全部核验通过 -> 进入试课阶段 status 6
                    if ((verification & 7) == 7 && o.getStatus() == 5) {
                        orderMapper.updateStatus(o.getId(), 6);
                        result.put("orderStatus", 6);
                    }
                    result.put("action", "payment verified -> verification=" + verification);
                } else {
                    result.put("action", "payment rejected -> 用户可重新上传凭证");
                }
            }
            case 5 -> { // 订单毁约仲裁
                if (approve) {
                    Order o = orderMapper.findById(log.getTarId());
                    if (o == null) throw new BizException("关联订单不存在");
                    orderMapper.updateStatus(o.getId(), 12);
                    result.put("action", "arbitration approved -> 订单终止(12)，押金退还线下处理");
                } else {
                    result.put("action", "arbitration rejected -> 订单维持原状态");
                }
            }
            default -> throw new BizException("未知请求类型");
        }

        // 回写 json：追加 decision/note/processedAt
        Map<String, Object> payload = readPayload(log.getJson());
        if (payload == null) payload = new LinkedHashMap<>();
        payload.put("decision", approve ? "approved" : "rejected");
        if (note != null) payload.put("note", note);
        payload.put("processedAt", LocalDateTime.now().toString());
        requestLogMapper.updateJson(id, writeJson(payload));

        result.put("decision", approve ? "approved" : "rejected");
        return ApiResponse.ok(result);
    }

    /** 管理员上传/更新订单的信息费收款码（教师缴费时扫码用） */
    @PostMapping("/orders/{id}/info-fee-qr")
    public ApiResponse<Void> uploadInfoFeeQr(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) throw new BizException("缺少收款码图片地址");
        Order o = orderMapper.findById(id);
        if (o == null) throw new BizException("订单不存在");
        orderMapper.updateInfoFeeQr(id, url);
        return ApiResponse.ok();
    }

    /** 调整信用分 */
    @PostMapping("/credit")
    public ApiResponse<Void> credit(@RequestBody Map<String, Object> body) {
        String role = body.get("role") == null ? null : String.valueOf(body.get("role"));
        Object idRaw = body.get("id");
        Object creditRaw = body.get("credit");
        if (idRaw == null || creditRaw == null || role == null) throw new BizException("缺少参数");
        int id = ((Number) idRaw).intValue();
        int credit = ((Number) creditRaw).intValue();
        if (credit < 0 || credit > 1000) throw new BizException("信用分范围 0~1000");
        if ("teacher".equals(role)) teacherMapper.updateCredit(id, credit);
        else if ("student".equals(role)) studentMapper.updateCredit(id, credit);
        else throw new BizException("角色不合法");
        return ApiResponse.ok();
    }

    /** 管理员列表 */
    @GetMapping("/admins")
    public ApiResponse<List<Admin>> admins() {
        List<Admin> list = adminMapper.selectAll();
        list.forEach(a -> a.setPassword(null));
        return ApiResponse.ok(list);
    }

    // ================= 账号注销 / 恢复 / 彻底删除（信用分管理页使用，便于清理脏数据）=================

    /**
     * 注销账号（软删除）：status -> -2。
     * 影响：不能登录、不再进入任何匹配池（池查询只取 status=0）、令牌立即失效；订单与历史数据保留。
     */
    @PostMapping("/accounts/{role}/{id}/deactivate")
    public ApiResponse<Void> deactivateAccount(@PathVariable String role, @PathVariable Integer id) {
        String r = normalizeRole(role);
        checkAccountExists(r, id);
        setAccountStatus(r, id, -2);
        return ApiResponse.ok();
    }

    /** 恢复已注销账号：status -> 0（重新进入寻找列表） */
    @PostMapping("/accounts/{role}/{id}/restore")
    public ApiResponse<Void> restoreAccount(@PathVariable String role, @PathVariable Integer id) {
        String r = normalizeRole(role);
        checkAccountExists(r, id);
        setAccountStatus(r, id, 0);
        return ApiResponse.ok();
    }

    /**
     * 彻底删除账号（物理删除，仅超管）：用于清理测试/脏数据。
     * 注意：订单表对 student/teacher 是 ON DELETE CASCADE，删除账号会**连带删除其名下全部订单**及关联明细，不可恢复。
     */
    @DeleteMapping("/accounts/{role}/{id}")
    public ApiResponse<Void> purgeAccount(@PathVariable String role, @PathVariable Integer id,
                                         @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId) {
        requireSuper(userId);
        String r = normalizeRole(role);
        checkAccountExists(r, id);
        if ("teacher".equals(r)) teacherMapper.deleteById(id);
        else studentMapper.deleteById(id);
        return ApiResponse.ok();
    }

    private String normalizeRole(String role) {
        if ("teacher".equals(role) || "student".equals(role)) return role;
        throw new BizException("角色不合法");
    }

    private void checkAccountExists(String role, Integer id) {
        boolean exists = "teacher".equals(role)
                ? teacherMapper.findById(id) != null
                : studentMapper.findById(id) != null;
        if (!exists) throw new BizException("账号不存在");
    }

    private void setAccountStatus(String role, Integer id, int status) {
        if ("teacher".equals(role)) teacherMapper.updateStatus(id, status);
        else studentMapper.updateStatus(id, status);
    }

    /** 创建管理员：仅超管（id=0 且 is_super=1） */
    @PostMapping("/admins")
    public ApiResponse<Admin> createAdmin(@RequestBody Map<String, String> body,
                                          @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId) {
        requireSuper(userId);
        String nickname = body.get("nickname");
        String phone = body.get("phone");
        String password = body.get("password");
        if (nickname == null || nickname.isBlank()) throw new BizException("请填写昵称");
        if (phone == null || !phone.matches("\\d{11}")) throw new BizException("请填写 11 位手机号");
        if (password == null || password.length() < 6) throw new BizException("密码至少 6 位");
        if (adminMapper.findByPhone(phone) != null) throw new BizException("该手机号已是管理员");
        Admin a = new Admin();
        a.setNickname(nickname);
        a.setPhone(phone);
        a.setPassword(PasswordUtil.encode(password));
        a.setIsSuper(0);
        adminMapper.insert(a);
        a.setPassword(null);
        return ApiResponse.ok(a);
    }

    /** 删除管理员：仅超管；id=0 初始管理员不可删除 */
    @DeleteMapping("/admins/{id}")
    public ApiResponse<Void> deleteAdmin(@PathVariable Integer id,
                                         @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId) {
        requireSuper(userId);
        if (id == 0) throw new BizException("id=0 的初始管理员不可删除");
        Admin a = adminMapper.findById(id);
        if (a == null) throw new BizException("管理员不存在");
        adminMapper.deleteById(id);
        return ApiResponse.ok();
    }

    private void requireSuper(String userId) {
        Admin me = adminMapper.findById(Integer.parseInt(userId));
        if (me == null || me.getIsSuper() == null || me.getIsSuper() != 1) {
            throw new BizException("仅超级管理员可执行此操作");
        }
    }

    /** requestLog -> 管理端展示视图 */
    private Map<String, Object> requestView(RequestLog log) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("type", log.getType());
        m.put("typeName", switch (log.getType()) {
            case 0 -> "教师入驻/资料修改";
            case 1 -> "学生入驻/资料修改";
            case 2 -> "教师定金核验";
            case 3 -> "学生定金核验";
            case 4 -> "教师信息费核验";
            case 5 -> "订单毁约仲裁";
            default -> "未知";
        });
        m.put("tarId", log.getTarId());
        m.put("adminId", log.getAdminId());
        m.put("createdAt", log.getCreatedAt());
        m.put("payload", readPayload(log.getJson()));
        // 关联展示
        if (log.getType() == 0 || log.getType() == 1) {
            int uid = log.getTarId();
            if (log.getType() == 0) {
                Teacher t = teacherMapper.findById(uid);
                m.put("targetName", t == null ? null : t.getNickname());
                m.put("targetPhone", t == null ? null : t.getPhone());
            } else {
                Student s = studentMapper.findById(uid);
                m.put("targetName", s == null ? null : s.getNickname());
                m.put("targetPhone", s == null ? null : s.getPhone());
            }
        } else if (log.getType() >= 2 && log.getType() <= 5) {
            Order o = orderMapper.findById(log.getTarId());
            if (o != null) {
                m.put("orderId", o.getId());
                m.put("orderStatus", o.getStatus());
            }
        }
        return m;
    }

    private String writeJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            throw new BizException("数据序列化失败");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readPayload(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
}
