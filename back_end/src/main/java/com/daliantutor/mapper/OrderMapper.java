package com.daliantutor.mapper;

import com.daliantutor.entity.Order;
import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单表 Mapper（order 是保留字，SQL 一律反引号）
 * 注意：列名 infoFeeQR 与 Java 属性 infoFeeQr 不自动匹配，必须 AS 别名
 */
@Mapper
public interface OrderMapper {

    String COLS = "id, student_id AS studentId, teacher_id AS teacherId, subject, hourly_wage AS hourlyWage, " +
            "depositImgTea, depositImgStu, infoFeeImg, infoFeeQR AS infoFeeQr, description, status, verification, infoFee, " +
            "timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7, " +
            "created_at AS createdAt, updated_at AS updatedAt";

    @Select("SELECT " + COLS + " FROM `order` WHERE id = #{id}")
    Order findById(Integer id);

    /** 同一对学生-老师之间进行中的订单（status < 12），用于防重复发起 */
    @Select("SELECT " + COLS + " FROM `order` WHERE student_id = #{studentId} AND teacher_id = #{teacherId} " +
            "AND status < 12 ORDER BY id DESC LIMIT 1")
    Order findActive(@Param("studentId") Integer studentId, @Param("teacherId") Integer teacherId);

    @Select("SELECT " + COLS + " FROM `order` WHERE student_id = #{studentId} ORDER BY id DESC")
    List<Order> selectByStudent(Integer studentId);

    @Select("SELECT " + COLS + " FROM `order` WHERE teacher_id = #{teacherId} ORDER BY id DESC")
    List<Order> selectByTeacher(Integer teacherId);

    @Select("SELECT " + COLS + " FROM `order` ORDER BY id DESC")
    List<Order> selectAll();

    /** 个人主页「进行中的订单列表」：status 0~11（已结束 12 不在其中） */
    @Select("<script>SELECT " + COLS + " FROM `order` WHERE status &lt; 12" +
            "<if test='role == \"student\"'> AND student_id = #{userId}</if>" +
            "<if test='role == \"teacher\"'> AND teacher_id = #{userId}</if>" +
            " ORDER BY id DESC</script>")
    List<Order> selectActiveByUser(@Param("role") String role, @Param("userId") Integer userId);

    @Insert("INSERT INTO `order` (student_id, teacher_id, subject, hourly_wage, depositImgTea, depositImgStu, " +
            "infoFeeImg, infoFeeQR, description, status, verification, infoFee, " +
            "timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7) " +
            "VALUES (#{studentId}, #{teacherId}, #{subject}, #{hourlyWage}, #{depositImgTea}, #{depositImgStu}, " +
            "#{infoFeeImg}, #{infoFeeQr}, #{description}, #{status}, #{verification}, #{infoFee}, " +
            "#{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Order order);

    @Update("UPDATE `order` SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);

    @Update("UPDATE `order` SET verification=#{verification} WHERE id=#{id}")
    int updateVerification(@Param("id") Integer id, @Param("verification") Integer verification);

    /** 订单明细（科目/时薪/时间表/说明）更新——明细确认流程中双方修改 */
    @Update("UPDATE `order` SET subject=#{subject}, hourly_wage=#{hourlyWage}, description=#{description}, " +
            "timeTable1=#{timeTable1}, timeTable2=#{timeTable2}, timeTable3=#{timeTable3}, timeTable4=#{timeTable4}, " +
            "timeTable5=#{timeTable5}, timeTable6=#{timeTable6}, timeTable7=#{timeTable7} WHERE id=#{id}")
    int updateDetail(Order order);

    /** 信息费金额（进入缴费阶段时按首周课时计算写入） */
    @Update("UPDATE `order` SET infoFee=#{infoFee} WHERE id=#{id}")
    int updateInfoFee(@Param("id") Integer id, @Param("infoFee") Integer infoFee);

    @Update("UPDATE `order` SET depositImgTea=#{img} WHERE id=#{id}")
    int updateDepositImgTea(@Param("id") Integer id, @Param("img") String img);

    @Update("UPDATE `order` SET depositImgStu=#{img} WHERE id=#{id}")
    int updateDepositImgStu(@Param("id") Integer id, @Param("img") String img);

    @Update("UPDATE `order` SET infoFeeImg=#{img} WHERE id=#{id}")
    int updateInfoFeeImg(@Param("id") Integer id, @Param("img") String img);

    @Update("UPDATE `order` SET infoFeeQR=#{img} WHERE id=#{id}")
    int updateInfoFeeQr(@Param("id") Integer id, @Param("img") String img);

    @Delete("DELETE FROM `order` WHERE id=#{id}")
    int deleteById(Integer id);

    /** 投递简历超 24 小时未确认（status 0/1）→ 定时清理物理删除 */
    @Delete("DELETE FROM `order` WHERE status IN (0,1) AND created_at < #{deadline}")
    int deleteExpiredDrafts(LocalDateTime deadline);
}
