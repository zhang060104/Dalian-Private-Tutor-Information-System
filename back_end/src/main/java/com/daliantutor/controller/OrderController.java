package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.common.BizException;
import com.daliantutor.dto.OrderApplyParams;
import com.daliantutor.dto.OrderVO;
import com.daliantutor.entity.Order;
import com.daliantutor.entity.Student;
import com.daliantutor.entity.Teacher;
import com.daliantutor.mapper.OrderMapper;
import com.daliantutor.mapper.StudentMapper;
import com.daliantutor.mapper.TeacherMapper;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 双向选择：老师投递简历 / 学生指派老师 → 落 `order` 表
 * 约定：status=0 老师投递待学生确认；status=1 学生指派待老师确认
 */
@RestController
@RequestMapping("/api/order")
public class OrderController {

    private final OrderMapper orderMapper;
    private final TeacherMapper teacherMapper;
    private final StudentMapper studentMapper;

    public OrderController(OrderMapper orderMapper, TeacherMapper teacherMapper, StudentMapper studentMapper) {
        this.orderMapper = orderMapper;
        this.teacherMapper = teacherMapper;
        this.studentMapper = studentMapper;
    }

    /** 发起选择（投递简历 / 指派老师） */
    @PostMapping("/apply")
    public ApiResponse<Order> apply(@RequestBody OrderApplyParams p,
                                    @RequestAttribute("authUserId") String userId,
                                    @RequestAttribute("authRole") String role) {
        int me = Integer.parseInt(userId);
        int studentId;
        int teacherId;
        int status;
        if ("teacher".equals(role)) {
            // 老师投递简历 → 目标是学生
            teacherId = me;
            studentId = p.getTargetId();
            status = 0;
        } else if ("student".equals(role)) {
            // 学生指派老师
            studentId = me;
            teacherId = p.getTargetId();
            status = 1;
        } else {
            throw new BizException("仅老师或学生可发起选择");
        }

        Student student = studentMapper.findById(studentId);
        if (student == null) throw new BizException("学生不存在");
        Teacher teacher = teacherMapper.findById(teacherId);
        if (teacher == null) throw new BizException("老师不存在");

        Order existed = orderMapper.findByDirection(studentId, teacherId, status);
        if (existed != null) {
            throw new BizException("已发起过该选择，请勿重复操作");
        }

        Order order = new Order();
        order.setStudentId(studentId);
        order.setTeacherId(teacherId);
        order.setSubject(student.getSubject());
        order.setHourlyWage(0);
        order.setStatus(status);
        order.setVerification(0);
        order.setInfoFee(0);
        // 初始授课时间取学生的空余时间，后续订单明细确认时可改
        order.setTimeTable1(student.getTimeTable1());
        order.setTimeTable2(student.getTimeTable2());
        order.setTimeTable3(student.getTimeTable3());
        order.setTimeTable4(student.getTimeTable4());
        order.setTimeTable5(student.getTimeTable5());
        order.setTimeTable6(student.getTimeTable6());
        order.setTimeTable7(student.getTimeTable7());
        orderMapper.insert(order);
        return ApiResponse.ok(order);
    }

    /** 取消选择 */
    @PostMapping("/cancel")
    public ApiResponse<Void> cancel(@RequestBody OrderApplyParams p,
                                    @RequestAttribute("authUserId") String userId,
                                    @RequestAttribute("authRole") String role) {
        int me = Integer.parseInt(userId);
        int studentId;
        int teacherId;
        int status;
        if ("teacher".equals(role)) {
            teacherId = me;
            studentId = p.getTargetId();
            status = 0;
        } else if ("student".equals(role)) {
            studentId = me;
            teacherId = p.getTargetId();
            status = 1;
        } else {
            throw new BizException("仅老师或学生可取消选择");
        }
        Order existed = orderMapper.findByDirection(studentId, teacherId, status);
        if (existed != null) {
            orderMapper.deleteById(existed.getId());
        }
        return ApiResponse.ok();
    }

    /** 我的订单/选择关系 */
    @GetMapping("/mine")
    public ApiResponse<List<OrderVO>> mine(@RequestAttribute("authUserId") String userId,
                                           @RequestAttribute("authRole") String role) {
        int me = Integer.parseInt(userId);
        List<Order> orders;
        if ("teacher".equals(role)) {
            orders = orderMapper.selectByTeacher(me);
        } else if ("student".equals(role)) {
            orders = orderMapper.selectByStudent(me);
        } else {
            orders = new ArrayList<>();
        }
        List<OrderVO> vos = new ArrayList<>();
        for (Order o : orders) {
            OrderVO vo = new OrderVO();
            copyFields(o, vo);
            Teacher t = teacherMapper.findById(o.getTeacherId());
            Student s = studentMapper.findById(o.getStudentId());
            vo.setTeacherName(t != null ? t.getNickname() : null);
            vo.setStudentName(s != null ? s.getNickname() : null);
            vo.setOtherName("teacher".equals(role) ? vo.getStudentName() : vo.getTeacherName());
            vos.add(vo);
        }
        return ApiResponse.ok(vos);
    }

    private void copyFields(Order src, Order dst) {
        dst.setId(src.getId());
        dst.setStudentId(src.getStudentId());
        dst.setTeacherId(src.getTeacherId());
        dst.setSubject(src.getSubject());
        dst.setHourlyWage(src.getHourlyWage());
        dst.setDescription(src.getDescription());
        dst.setStatus(src.getStatus());
        dst.setVerification(src.getVerification());
        dst.setInfoFee(src.getInfoFee());
        dst.setTimeTable1(src.getTimeTable1());
        dst.setTimeTable2(src.getTimeTable2());
        dst.setTimeTable3(src.getTimeTable3());
        dst.setTimeTable4(src.getTimeTable4());
        dst.setTimeTable5(src.getTimeTable5());
        dst.setTimeTable6(src.getTimeTable6());
        dst.setTimeTable7(src.getTimeTable7());
        dst.setCreatedAt(src.getCreatedAt());
    }
}
