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
 * 个人资料修改审核
 *
 * 申请人提交 → 写入 requestLog（type 0=教师信息修改，1=学生信息修改，json 存变更快照）→
 * 管理员审核：通过则把 json 中的新资料合并进 teacher / student 表，驳回则仅删除该请求。
 * 审核通过前对外展示的一直是旧资料。
 */
@Service
public class ProfileReviewService {

    public static final int TYPE_TEACHER = 0;
    public static final int TYPE_STUDENT = 1;

    private final RequestLogMapper requestLogMapper;
    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final ObjectMapper objectMapper;

    public ProfileReviewService(RequestLogMapper requestLogMapper, TeacherMapper teacherMapper,
                                StudentMapper studentMapper, ObjectMapper objectMapper) {
        this.requestLogMapper = requestLogMapper;
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.objectMapper = objectMapper;
    }

    /** 角色 → requestLog.type */
    public int typeOf(String role) {
        if ("teacher".equals(role)) return TYPE_TEACHER;
        if ("student".equals(role)) return TYPE_STUDENT;
        throw new BizException("当前角色不支持修改个人资料");
    }

    /** 我的待审申请（没有则返回 null） */
    public ProfileReviewVO findMine(int type, int userId) {
        RequestLog log = requestLogMapper.findByTypeAndTarId(type, userId);
        return log == null ? null : toVo(log);
    }

    /** 提交资料修改申请 */
    public ProfileReviewVO submit(int type, int userId, ProfileReviewSubmit body) {
        if (body == null || body.getProfile() == null || body.getProfile().isEmpty()) {
            throw new BizException("缺少修改内容");
        }
        if (body.getFields() == null || body.getFields().isEmpty()) {
            throw new BizException("资料没有任何改动");
        }
        if (requestLogMapper.findByTypeAndTarId(type, userId) != null) {
            throw new BizException("已有待审申请，请等待管理员审核或先撤销");
        }
        if (body.getName() == null || body.getName().isBlank()) {
            throw new BizException("缺少申请人姓名");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", body.getName());
        payload.put("fields", body.getFields());
        payload.put("profile", body.getProfile());
        payload.put("submittedAt", LocalDateTime.now().toString());

        RequestLog log = new RequestLog();
        log.setType(type);
        log.setTarId(userId);
        log.setJson(writeJson(payload));
        requestLogMapper.insert(log);

        // 重新读取，取数据库生成的 created_at
        RequestLog saved = requestLogMapper.findById(log.getId());
        return toVo(saved != null ? saved : log);
    }

    /** 撤销自己的申请 */
    public void cancel(int id, int type, int userId) {
        RequestLog log = requestLogMapper.findById(id);
        if (log == null || log.getType() != type || !Integer.valueOf(userId).equals(log.getTarId())) {
            throw new BizException("申请不存在或无权操作");
        }
        requestLogMapper.deleteById(id);
    }

    /**
     * 审核通过：把申请中的新资料合并进 teacher / student 表
     * 只覆盖 profile 中出现的字段，其余字段保持数据库原值
     */
    public void apply(RequestLog log) {
        Map<String, Object> payload = readPayload(log.getJson());
        Object raw = payload == null ? null : payload.get("profile");
        if (!(raw instanceof Map)) {
            throw new BizException("该请求不是资料修改申请");
        }
        String profileJson = writeJson(raw);
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
            throw new BizException("审核通过失败：" + e.getMessage());
        }
    }

    /** 管理端：所有待审的资料修改申请 */
    public List<ProfileReviewVO> listPending() {
        List<ProfileReviewVO> list = new ArrayList<>();
        for (RequestLog log : requestLogMapper.selectAll()) {
            if (log.getType() == TYPE_TEACHER || log.getType() == TYPE_STUDENT) {
                list.add(toVo(log));
            }
        }
        return list;
    }

    /** requestLog → VO */
    public ProfileReviewVO toVo(RequestLog log) {
        Map<String, Object> payload = readPayload(log.getJson());
        ProfileReviewVO vo = new ProfileReviewVO();
        vo.setId(log.getId());
        vo.setRole(log.getType() == TYPE_TEACHER ? "teacher" : "student");
        vo.setSubmittedAt(log.getCreatedAt() == null ? null : log.getCreatedAt().toString());
        if (payload != null) {
            if (payload.get("name") != null) vo.setName(String.valueOf(payload.get("name")));
            if (payload.get("submittedAt") != null && vo.getSubmittedAt() == null) {
                vo.setSubmittedAt(String.valueOf(payload.get("submittedAt")));
            }
            Object fields = payload.get("fields");
            if (fields != null) {
                vo.setFields(objectMapper.convertValue(fields, new TypeReference<List<ProfileFieldDiff>>() {}));
            }
        }
        vo.setPhone(log.getType() == TYPE_TEACHER ? phoneOfTeacher(log.getTarId()) : phoneOfStudent(log.getTarId()));
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
