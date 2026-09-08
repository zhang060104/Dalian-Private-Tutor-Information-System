package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.dto.OrderVO;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.RequestLog;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.OrderMapper;
import com.daliantutor.mapper.RequestLogMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 管理后台：统计、老师/学生/订单列表、待审核请求
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;
    private final OrderMapper orderMapper;
    private final RequestLogMapper requestLogMapper;

    public AdminController(TeacherMapper teacherMapper, StudentMapper studentMapper,
                           OrderMapper orderMapper, RequestLogMapper requestLogMapper) {
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
        this.orderMapper = orderMapper;
        this.requestLogMapper = requestLogMapper;
    }

    /** 统计：老师/学生/订单/匹配数 */
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        List<Teacher> teachers = teacherMapper.selectAll();
        List<Student> students = studentMapper.selectAll();
        List<Order> orders = orderMapper.selectAll();

        // 匹配数：同一 (teacher, student) 对同时存在 status=0 与 status=1
        Map<String, Integer> flags = new HashMap<>();
        for (Order o : orders) {
            String key = o.getTeacherId() + "|" + o.getStudentId();
            int v = flags.getOrDefault(key, 0);
            flags.put(key, v | (o.getStatus() == 0 ? 1 : 2));
        }
        int matched = 0;
        for (int v : flags.values()) {
            if (v == 3) matched++;
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("teacherCount", teachers.size());
        r.put("studentCount", students.size());
        r.put("orderCount", orders.size());
        r.put("matchedCount", matched);
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

    @GetMapping("/orders")
    public ApiResponse<List<OrderVO>> orders() {
        List<Order> orders = orderMapper.selectAll();
        List<OrderVO> vos = new ArrayList<>();
        for (Order o : orders) {
            OrderVO vo = new OrderVO();
            vo.setId(o.getId());
            vo.setStudentId(o.getStudentId());
            vo.setTeacherId(o.getTeacherId());
            vo.setSubject(o.getSubject());
            vo.setHourlyWage(o.getHourlyWage());
            vo.setDescription(o.getDescription());
            vo.setStatus(o.getStatus());
            vo.setVerification(o.getVerification());
            vo.setInfoFee(o.getInfoFee());
            vo.setCreatedAt(o.getCreatedAt());
            Teacher t = teacherMapper.findById(o.getTeacherId());
            Student s = studentMapper.findById(o.getStudentId());
            vo.setTeacherName(t != null ? t.getNickname() : null);
            vo.setStudentName(s != null ? s.getNickname() : null);
            vos.add(vo);
        }
        return ApiResponse.ok(vos);
    }

    @GetMapping("/requests")
    public ApiResponse<List<RequestLog>> requests() {
        return ApiResponse.ok(requestLogMapper.selectAll());
    }

    /** 处理待审核请求（通过/驳回均为移除该请求） */
    @PostMapping("/requests/{id}/resolve")
    public ApiResponse<Void> resolve(@PathVariable Integer id) {
        if (requestLogMapper.findById(id) == null) {
            throw new BizException("请求不存在");
        }
        requestLogMapper.deleteById(id);
        return ApiResponse.ok();
    }
}
