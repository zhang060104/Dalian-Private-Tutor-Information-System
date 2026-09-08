package com.daliantutor.mapper;

import com.daliantutor.entity.Student;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface StudentMapper {

    @Select("SELECT * FROM student WHERE phone = #{phone} LIMIT 1")
    Student findByPhone(String phone);

    @Select("SELECT * FROM student WHERE id = #{id}")
    Student findById(Integer id);

    @Select("SELECT * FROM student ORDER BY id")
    List<Student> selectAll();

    @Select("SELECT * FROM student WHERE status = 0 ORDER BY id")
    List<Student> selectAvailable();

    @Insert("INSERT INTO student (nickname, password, phone, age, gender, credit, grade, subject, description, status, address, " +
            "timeTable1, timeTable2, timeTable3, timeTable4, timeTable5, timeTable6, timeTable7) " +
            "VALUES (#{nickname}, #{password}, #{phone}, #{age}, #{gender}, #{credit}, #{grade}, #{subject}, #{description}, #{status}, #{address}, " +
            "#{timeTable1}, #{timeTable2}, #{timeTable3}, #{timeTable4}, #{timeTable5}, #{timeTable6}, #{timeTable7})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Student student);

    @Update("UPDATE student SET nickname=#{nickname}, age=#{age}, gender=#{gender}, grade=#{grade}, subject=#{subject}, " +
            "description=#{description}, address=#{address}, timeTable1=#{timeTable1}, timeTable2=#{timeTable2}, timeTable3=#{timeTable3}, " +
            "timeTable4=#{timeTable4}, timeTable5=#{timeTable5}, timeTable6=#{timeTable6}, timeTable7=#{timeTable7} " +
            "WHERE id=#{id}")
    int updateProfile(Student student);

    @Update("UPDATE student SET status=#{status} WHERE id=#{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);
}
