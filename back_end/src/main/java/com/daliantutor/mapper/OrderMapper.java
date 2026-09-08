package com.daliantutor.mapper;

import com.daliantutor.entity.Order;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface OrderMapper {

    @Select("SELECT * FROM `order` WHERE id = #{id}")
    Order findById(Integer id);

    @Select("SELECT * FROM `order` WHERE student_id = #{studentId} AND teacher_id = #{teacherId} AND status = #{status} LIMIT 1")
    Order findByDirection(@Param("studentId") Integer studentId, @Param("teacherId") Integer teacherId, @Param("status") Integer status);

    @Select("SELECT * FROM `order` WHERE teacher_id = #{teacherId} ORDER BY id DESC")
    List<Order> selectByTeacher(Integer teacherId);

    @Select("SELECT * FROM `order` WHERE student_id = #{studentId} ORDER BY id DESC")
    List<Order> selectByStudent(Integer studentId);

    @Select("SELECT * FROM `order` ORDER BY id DESC")
    List<Order> selectAll();

    @Insert("INSERT INTO `order` (student_id, teacher_id, subject, hourly_wage, description, status, verification, infoFee, " +
            "timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7) " +
            "VALUES (#{studentId}, #{teacherId}, #{subject}, #{hourlyWage}, #{description}, #{status}, #{verification}, #{infoFee}, " +
            "#{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Order order);

    @Update("UPDATE `order` SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);

    @Delete("DELETE FROM `order` WHERE id=#{id}")
    int deleteById(Integer id);
}
