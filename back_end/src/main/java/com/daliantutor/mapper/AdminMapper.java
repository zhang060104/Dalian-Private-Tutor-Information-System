package com.daliantutor.mapper;

import com.daliantutor.entity.Admin;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface AdminMapper {

    @Select("SELECT id, nickname, password, phone, is_super AS isSuper FROM admin WHERE id = #{id}")
    Admin findById(Integer id);

    @Select("SELECT id, nickname, password, phone, is_super AS isSuper FROM admin WHERE phone = #{phone}")
    Admin findByPhone(String phone);

    @Select("SELECT id, nickname, password, phone, is_super AS isSuper FROM admin ORDER BY id")
    List<Admin> selectAll();

    @Insert("INSERT INTO admin (nickname, password, phone, is_super) VALUES (#{nickname}, #{password}, #{phone}, #{isSuper})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Admin admin);

    @Delete("DELETE FROM admin WHERE id=#{id}")
    int deleteById(Integer id);
}
