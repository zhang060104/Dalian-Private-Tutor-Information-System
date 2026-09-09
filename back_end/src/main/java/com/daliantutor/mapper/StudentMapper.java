package com.daliantutor.mapper;

import com.daliantutor.entity.Student;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 学生表 Mapper
 * 注意：列名 QRcode / IDcard 与 Java 属性 qrcode / idcard 不自动匹配，必须 AS 别名
 */
@Mapper
public interface StudentMapper {

    String COLS = "id, nickname, password, phone, age, gender, credit, grade, subject, " +
            "description, status, address, timeTable1, timeTable2, timeTable3, timeTable4, " +
            "timeTable5, timeTable6, timeTable7, QRcode AS qrcode, IDcard AS idcard";

    @Select("SELECT " + COLS + " FROM student WHERE id = #{id}")
    Student findById(Integer id);

    @Select("SELECT " + COLS + " FROM student WHERE phone = #{phone}")
    Student findByPhone(String phone);

    /** 管理端全量 */
    @Select("SELECT " + COLS + " FROM student ORDER BY id DESC")
    List<Student> selectAll();

    /**
     * 学生池列表（对教师端展示）：仅正在寻找老师(status=0)的用户
     * subject：位掩码交集匹配（& 结果非 0 即命中）；grade/gender 精确；keyword 模糊匹配昵称/简介
     */
    @Select("<script>SELECT " + COLS + " FROM student WHERE status = 0" +
            "<if test='subject != null'> AND (subject &amp; #{subject}) &gt; 0</if>" +
            "<if test='grade != null'> AND grade = #{grade}</if>" +
            "<if test='gender != null and gender != \"\"'> AND gender = #{gender}</if>" +
            "<if test='keyword != null and keyword != \"\"'> AND (nickname LIKE CONCAT('%', #{keyword}, '%') OR description LIKE CONCAT('%', #{keyword}, '%'))</if>" +
            " ORDER BY credit DESC, id DESC</script>")
    List<Student> selectPool(@Param("subject") Integer subject,
                             @Param("grade") Integer grade,
                             @Param("gender") String gender,
                             @Param("keyword") String keyword);

    @Insert("INSERT INTO student (nickname, password, phone, age, gender, credit, grade, subject, description, status, " +
            "address, timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7, QRcode, IDcard) " +
            "VALUES (#{nickname}, #{password}, #{phone}, #{age}, #{gender}, #{credit}, #{grade}, #{subject}, #{description}, #{status}, " +
            "#{address}, #{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7}, #{qrcode}, #{idcard})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Student student);

    /** 资料修改审核通过后落库：只更新非空字段由 Service 层控制 */
    @Update("UPDATE student SET nickname=#{nickname}, age=#{age}, gender=#{gender}, grade=#{grade}, subject=#{subject}, " +
            "description=#{description}, address=#{address}, timeTable1=#{timeTable1}, timeTable2=#{timeTable2}, " +
            "timeTable3=#{timeTable3}, timeTable4=#{timeTable4}, timeTable5=#{timeTable5}, timeTable6=#{timeTable6}, " +
            "timeTable7=#{timeTable7}, QRcode=#{qrcode}, IDcard=#{idcard} WHERE id=#{id}")
    int updateProfile(Student student);

    @Update("UPDATE student SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);

    @Update("UPDATE student SET credit=#{credit} WHERE id=#{id}")
    int updateCredit(@Param("id") Integer id, @Param("credit") Integer credit);

    @Delete("DELETE FROM student WHERE id=#{id}")
    int deleteById(Integer id);
}
