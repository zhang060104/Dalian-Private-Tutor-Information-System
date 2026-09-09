package com.daliantutor.mapper;

import com.daliantutor.entity.Teacher;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 教师表 Mapper
 * 注意：列名 QRcode / IDcard 与 Java 属性 qrcode / idcard 不自动匹配，必须 AS 别名
 */
@Mapper
public interface TeacherMapper {

    String COLS = "id, nickname, password, phone, age, gender, credit, grade, subject, " +
            "description, status, address, timeTable1, timeTable2, timeTable3, timeTable4, " +
            "timeTable5, timeTable6, timeTable7, QRcode AS qrcode, IDcard AS idcard, certificate";

    @Select("SELECT " + COLS + " FROM teacher WHERE id = #{id}")
    Teacher findById(Integer id);

    @Select("SELECT " + COLS + " FROM teacher WHERE phone = #{phone}")
    Teacher findByPhone(String phone);

    /** 管理端全量 */
    @Select("SELECT " + COLS + " FROM teacher ORDER BY id DESC")
    List<Teacher> selectAll();

    /**
     * 教师池列表（对学生端展示）：仅正在寻找学生(status=0)的教师
     * subject：位掩码交集匹配；grade 可授年级 >= 学生年级时视为可教（grade 为教师可授学段上限语义，取精确匹配）
     */
    @Select("<script>SELECT " + COLS + " FROM teacher WHERE status = 0" +
            "<if test='subject != null'> AND (subject &amp; #{subject}) &gt; 0</if>" +
            "<if test='grade != null'> AND grade = #{grade}</if>" +
            "<if test='gender != null and gender != \"\"'> AND gender = #{gender}</if>" +
            "<if test='keyword != null and keyword != \"\"'> AND (nickname LIKE CONCAT('%', #{keyword}, '%') OR description LIKE CONCAT('%', #{keyword}, '%'))</if>" +
            " ORDER BY credit DESC, id DESC</script>")
    List<Teacher> selectPool(@Param("subject") Integer subject,
                             @Param("grade") Integer grade,
                             @Param("gender") String gender,
                             @Param("keyword") String keyword);

    @Insert("INSERT INTO teacher (nickname, password, phone, age, gender, credit, grade, subject, description, status, " +
            "address, timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7, QRcode, IDcard, certificate) " +
            "VALUES (#{nickname}, #{password}, #{phone}, #{age}, #{gender}, #{credit}, #{grade}, #{subject}, #{description}, #{status}, " +
            "#{address}, #{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7}, #{qrcode}, #{idcard}, #{certificate})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Teacher teacher);

    /** 资料修改审核通过后落库 */
    @Update("UPDATE teacher SET nickname=#{nickname}, age=#{age}, gender=#{gender}, grade=#{grade}, subject=#{subject}, " +
            "description=#{description}, address=#{address}, timeTable1=#{timeTable1}, timeTable2=#{timeTable2}, " +
            "timeTable3=#{timeTable3}, timeTable4=#{timeTable4}, timeTable5=#{timeTable5}, timeTable6=#{timeTable6}, " +
            "timeTable7=#{timeTable7}, QRcode=#{qrcode}, IDcard=#{idcard}, certificate=#{certificate} WHERE id=#{id}")
    int updateProfile(Teacher teacher);

    @Update("UPDATE teacher SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);

    @Update("UPDATE teacher SET credit=#{credit} WHERE id=#{id}")
    int updateCredit(@Param("id") Integer id, @Param("credit") Integer credit);

    @Delete("DELETE FROM teacher WHERE id=#{id}")
    int deleteById(Integer id);
}
