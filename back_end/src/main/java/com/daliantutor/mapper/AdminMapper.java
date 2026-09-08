package com.daliantutor.mapper;

import com.daliantutor.entity.Admin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AdminMapper {

    @Select("SELECT * FROM admin WHERE phone = #{phone} LIMIT 1")
    Admin findByPhone(String phone);
}
