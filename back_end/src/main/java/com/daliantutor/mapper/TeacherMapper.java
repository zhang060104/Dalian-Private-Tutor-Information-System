package com.daliantutor.mapper;

import com.daliantutor.entity.Teacher;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface TeacherMapper {

    @Select("SELECT * FROM teacher WHERE phone = #{phone} LIMIT 1")
    Teacher findByPhone(String phone);

    @Select("SELECT * FROM teacher WHERE id = #{id}")
    Teacher findById(Integer id);

    @Select("SELECT * FROM teacher ORDER BY id")
    List<Teacher> selectAll();

    @Select("SELECT * FROM teacher WHERE status = 0 ORDER BY id")
    List<Teacher> selectAvailable();

    @Insert("INSERT INTO teacher (nickname, password, phone, age, gender, credit, grade, subject, description, status, " +
            "timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7) " +
            "VALUES (#{nickname}, #{password}, #{phone}, #{age}, #{gender}, #{credit}, #{grade}, #{subject}, #{description}, #{status}, " +
            "#{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Teacher teacher);

    @Update("UPDATE teacher SET nickname=#{nickname}, age=#{age}, gender=#{gender}, grade=#{grade}, subject=#{subject}, " +
            "description=#{description}, timeTable1=#{timeTable1}, timeTable2=#{timeTable2}, timeTable3=#{timeTable3}, " +
            "timeTable4=#{timeTable4}, timeTable5=#{timeTable5}, timeTable6=#{timeTable6}, timeTable7=#{timeTable7} " +
            "WHERE id=#{id}")
    int updateProfile(Teacher teacher);

    @Update("UPDATE teacher SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);
}
