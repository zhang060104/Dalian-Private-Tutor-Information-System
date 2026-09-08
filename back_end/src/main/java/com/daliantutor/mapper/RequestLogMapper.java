package com.daliantutor.mapper;

import com.daliantutor.entity.RequestLog;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface RequestLogMapper {

    @Select("SELECT * FROM requestLog ORDER BY id DESC")
    List<RequestLog> selectAll();

    @Select("SELECT * FROM requestLog WHERE type = #{type} ORDER BY id DESC")
    List<RequestLog> selectByType(Integer type);

    @Select("SELECT * FROM requestLog WHERE id = #{id}")
    RequestLog findById(Integer id);

    @Insert("INSERT INTO requestLog (type, tarID, json) VALUES (#{type}, #{tarId}, #{json})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(RequestLog log);

    @Delete("DELETE FROM requestLog WHERE id=#{id}")
    int deleteById(Integer id);
}
