package com.daliantutor.service;

import com.daliantutor.common.BizException;
import com.daliantutor.dto.ProfileFieldDiff;
import com.daliantutor.dto.ProfileReviewSubmit;
import com.daliantutor.dto.ProfileReviewVO;
import com.daliantutor.entity.RequestLog;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.RequestLogMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 个人信息审核（入驻注册 + 资料修改），统一走 requestLog：
 * type 0=教师，1=学生；json.kind=register（入驻申请） / update（资料修改）。
 *
 * 处理语义（管理员 resolve）：
 * - kind=register approve -> 账号 status 置 0（激活入驻）；reject/撤回 -> 删除未激活账号（手机号可重新注册）
 * - kind=update   approve -> 合并 json.profile 落库；reject -> 仅标记
 * 处理完的 requestLog 不删除，置 admin_id 供追溯；待审 = admin_id = -1。
 */
@Service
public class ProfileReviewService {

    public static final int TYPE_TEACHER = 0;
    public static final int TYPE_STUDENT = 1;

    private final RequestLogMapper requestLogMapper;
    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final CaptchaService captchaService;
    private final ObjectMapper objectMapper;

    public ProfileReviewService(RequestLogMapper requestLogMapper, TeacherMapper teacherMapper,
                                StudentMapper studentMapper, CaptchaService captchaService,
                                ObjectMapper objectMapper) {
        this.requestLogMapper = requestLogMapper;
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.captchaService = captchaService;
        this.objectMapper = objectMapper;
    }

    /** 校验并消费滑块验证码 token */
    public void verifyCaptcha(String token) {
        captchaService.consume(token);
    }

    /** 角色 -> requestLog.type */
    public int typeOf(String role) {
        if ("teacher".equals(role)) return TYPE_TEACHER;
        if ("student".equals(role)) return TYPE_STUDENT;
        throw new BizException("当前角色不支持修改个人资料");
    }

    /** 我的最新一条审核请求（无则返回 null），带处理状态 */
    public ProfileReviewVO findMine(int type, int userId) {
        List<RequestLog> logs = requestLogMapper.listByTypeAndTarId(type, userId);
        return logs.isEmpty() ? null : toVo(logs.get(0));
    }

    /** 是否有待审请求（任意 kind） */
    public boolean hasPending(int type, int userId) {
        return requestLogMapper.findPending(type, userId) != null;
    }

    /** 提交入驻申请（账号已由注册接口创建，status=1） */
    public ProfileReviewVO submitRegister(int type, int accountId, String name, Map<String, Object> profile) {
        if (hasPending(type, accountId)) {
            throw new BizException("已有待审核的入驻申请，请等待管理员处理");
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("kind", "register");
        payload.put("name", name);
        payload.put("profile", profile);
        payload.put("submittedAt", LocalDateTime.now().toString());
        return insertLog(type, accountId, payload);
    }

    /** 提交资料修改申请（需先过滑块验证码）；status=1（入驻被驳回）用户提交 = 重新激活申请 */
    public ProfileReviewVO submit(int type, int userId, ProfileReviewSubmit body) {
        if (body == null || body.getProfile() == null || body.getProfile().isEmpty()) {
            throw new BizException("缺少修改内容");
        }
        if (body.getFields() == null || body.getFields().isEmpty()) {
            throw new BizException("本次没有任何改动");
        }
        if (hasPending(type, userId)) {
            throw new BizException("已有待审核的申请，请等待管理员处理或先撤回");
        }
        if (body.getName() == null || body.getName().isBlank()) {
            throw new BizException("缺少提交人昵称");
        }
        // 入驻被驳回（status=1）的账号再次提交 = 重新激活入驻申请；正常账号提交 = 资料修改
        boolean reactivate = accountStatus(type, userId) == 1;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("kind", reactivate ? "register" : "update");
        payload.put("name", body.getName());
        payload.put("fields", body.getFields());
        payload.put("profile", body.getProfile());
        payload.put("submittedAt", LocalDateTime.now().toString());
        return insertLog(type, userId, payload);
    }

    private int accountStatus(int type, int userId) {
        if (type == TYPE_TEACHER) {
            Teacher t = teacherMapper.findById(userId);
            return t == null || t.getStatus() == null ? 1 : t.getStatus();
        }
        Student s = studentMapper.findById(userId);
        return s == null || s.getStatus() == null ? 1 : s.getStatus();
    }

    private ProfileReviewVO insertLog(int type, int tarId, Map<String, Object> payload) {
        RequestLog log = new RequestLog();
        log.setType(type);
        log.setTarId(tarId);
        log.setJson(writeJson(payload));
        log.setAdminId(-1);
        requestLogMapper.insert(log);
        return toVo(log);
    }

    /** 用户撤回自己的待审请求；入驻申请撤回则同时删除未激活账号 */
    public void cancel(int id, int type, int userId) {
        RequestLog log = requestLogMapper.findById(id);
        if (log == null || log.getType() != type || !Integer.valueOf(userId).equals(log.getTarId())) {
            throw new BizException("请求不存在或无权操作");
        }
        if (log.getAdminId() != null && log.getAdminId() != -1) {
            throw new BizException("该请求已被管理员处理，无法撤回");
        }
        Map<String, Object> payload = readPayload(log.getJson());
        boolean isRegister = payload != null && "register".equals(payload.get("kind"));
        requestLogMapper.deleteById(id);
        // 撤回入驻申请：账号尚未激活且无任何数据价值，直接删除以释放手机号
        if (isRegister) {
            if (type == TYPE_TEACHER) teacherMapper.deleteById(userId);
            else studentMapper.deleteById(userId);
        }
    }

    /** 管理员 approve：kind=register -> 激活账号；kind=update -> 合并资料落库 */
    public void approve(RequestLog log, Map<String, Object> overrideProfile) {
        Map<String, Object> payload = readPayload(log.getJson());
        if (payload == null) throw new BizException("请求数据损坏");
        String kind = payload.get("kind") == null ? "update" : String.valueOf(payload.get("kind"));

        if ("register".equals(kind)) {
            // 合并资料（首次注册=幂等副本；被驳回重提=修正后的资料），随后激活账号参与列表
            Map<String, Object> profile = overrideProfile != null ? overrideProfile : rawProfile(payload);
            if (profile != null && !profile.isEmpty()) {
                applyProfile(log, profile);
            }
            if (log.getType() == TYPE_TEACHER) {
                teacherMapper.updateStatus(log.getTarId(), 0);
            } else {
                studentMapper.updateStatus(log.getTarId(), 0);
            }
            return;
        }
        applyProfile(log, overrideProfile != null ? overrideProfile : rawProfile(payload));
    }

    /**
     * 管理员驳回：数据不动，账号保留（status 保持 1 未激活）。
     * 用户可登录后修改资料重新提交入驻申请（re-register 或 kind=update），管理员可手动修正后通过。
     */
    public void reject(RequestLog log) {
        // 无数据变更，仅 json 标记 decision
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> rawProfile(Map<String, Object> payload) {
        Object raw = payload.get("profile");
        return raw instanceof Map ? (Map<String, Object>) raw : null;
    }

    /** 把 profile 合并到 teacher / student（仅出现字段覆盖，供 kind=update） */
    public void applyProfile(RequestLog log, Map<String, Object> profile) {
        if (profile == null || profile.isEmpty()) {
            throw new BizException("缺少可落库的资料");
        }
        String profileJson = writeJson(profile);
        try {
            if (log.getType() == TYPE_TEACHER) {
                Teacher t = teacherMapper.findById(log.getTarId());
                if (t == null) throw new BizException("账号不存在");
                Teacher merged = objectMapper.readerForUpdating(t).readValue(profileJson, Teacher.class);
                merged.setId(log.getTarId());
                teacherMapper.updateProfile(merged);
            } else {
                Student s = studentMapper.findById(log.getTarId());
                if (s == null) throw new BizException("账号不存在");
                Student merged = objectMapper.readerForUpdating(s).readValue(profileJson, Student.class);
                merged.setId(log.getTarId());
                studentMapper.updateProfile(merged);
            }
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException("资料合并失败：" + e.getMessage());
        }
    }

    /** 管理员：待审（admin_id=-1）type 0/1 的审核请求列表 */
    public List<ProfileReviewVO> listPending() {
        List<ProfileReviewVO> list = new ArrayList<>();
        for (RequestLog log : requestLogMapper.selectByType(null, true)) {
            if (log.getType() == TYPE_TEACHER || log.getType() == TYPE_STUDENT) {
                list.add(toVo(log));
            }
        }
        return list;
    }

    /** requestLog -> VO（含 kind / adminId / decision 处理状态） */
    public ProfileReviewVO toVo(RequestLog log) {
        Map<String, Object> payload = readPayload(log.getJson());
        ProfileReviewVO vo = new ProfileReviewVO();
        vo.setId(log.getId());
        vo.setRole(log.getType() == TYPE_TEACHER ? "teacher" : "student");
        vo.setPhone(log.getType() == TYPE_TEACHER ? phoneOfTeacher(log.getTarId()) : phoneOfStudent(log.getTarId()));
        vo.setSubmittedAt(log.getCreatedAt() == null ? null : log.getCreatedAt().toString());
        vo.setAdminId(log.getAdminId());
        if (payload != null) {
            vo.setKind(payload.get("kind") == null ? null : String.valueOf(payload.get("kind")));
            if (payload.get("name") != null) vo.setName(String.valueOf(payload.get("name")));
            if (payload.get("decision") != null) vo.setDecision(String.valueOf(payload.get("decision")));
            if (payload.get("note") != null) vo.setNote(String.valueOf(payload.get("note")));
            if (payload.get("submittedAt") != null && vo.getSubmittedAt() == null) {
                vo.setSubmittedAt(String.valueOf(payload.get("submittedAt")));
            }
            Object fields = payload.get("fields");
            if (fields != null) {
                vo.setFields(objectMapper.convertValue(fields, new TypeReference<List<ProfileFieldDiff>>() {}));
            }
            if (payload.get("profile") instanceof Map) {
                vo.setProfile((Map<String, Object>) payload.get("profile"));
            }
        }
        if (vo.getName() == null) {
            vo.setName(log.getType() == TYPE_TEACHER ? nameOfTeacher(log.getTarId()) : nameOfStudent(log.getTarId()));
        }
        return vo;
    }

    private String phoneOfTeacher(Integer id) {
        Teacher t = teacherMapper.findById(id);
        return t == null ? "" : t.getPhone();
    }

    private String phoneOfStudent(Integer id) {
        Student s = studentMapper.findById(id);
        return s == null ? "" : s.getPhone();
    }

    private String nameOfTeacher(Integer id) {
        Teacher t = teacherMapper.findById(id);
        return t == null ? "" : t.getNickname();
    }

    private String nameOfStudent(Integer id) {
        Student s = studentMapper.findById(id);
        return s == null ? "" : s.getNickname();
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
