package com.daliantutor.mapper;

import com.daliantutor.entity.RequestLog;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 管理员审核请求表 Mapper
 */
@Mapper
public interface RequestLogMapper {

    String COLS = "id, type, tarID AS tarId, json, admin_id AS adminId, created_at AS createdAt";

    @Select("SELECT " + COLS + " FROM requestLog WHERE id = #{id}")
    RequestLog findById(Integer id);

    /** 某目标最新一条未处理请求（用于防重复提交） */
    @Select("SELECT " + COLS + " FROM requestLog WHERE type = #{type} AND tarID = #{tarId} AND admin_id = -1 ORDER BY id DESC LIMIT 1")
    RequestLog findPending(@Param("type") Integer type, @Param("tarId") Integer tarId);

    /** 某目标全部请求（新的在前） */
    @Select("SELECT " + COLS + " FROM requestLog WHERE type = #{type} AND tarID = #{tarId} ORDER BY id DESC")
    List<RequestLog> listByTypeAndTarId(@Param("type") Integer type, @Param("tarId") Integer tarId);

    /** 全部请求（待审优先） */
    @Select("SELECT " + COLS + " FROM requestLog ORDER BY (admin_id = -1) DESC, id DESC")
    List<RequestLog> selectAll();

    /** 按类型/待审筛选；type=-1 表示全部类型 */
    @Select("<script>SELECT " + COLS + " FROM requestLog" +
            "<where>" +
            "<if test='type != null and type >= 0'> AND type = #{type}</if>" +
            "<if test='pendingOnly'> AND admin_id = -1</if>" +
            "</where>" +
            " ORDER BY id DESC</script>")
    List<RequestLog> selectByType(@Param("type") Integer type, @Param("pendingOnly") boolean pendingOnly);

    @Insert("INSERT INTO requestLog (type, tarID, json, admin_id) VALUES (#{type}, #{tarId}, #{json}, #{adminId})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(RequestLog log);

    /** 管理员认领（把 admin_id 从 -1 改为自己，仅未处理时生效，防并发） */
    @Update("UPDATE requestLog SET admin_id=#{adminId} WHERE id=#{id} AND admin_id=-1")
    int claim(@Param("id") Integer id, @Param("adminId") Integer adminId);

    /** 处理完回写 json（追加 decision/note） */
    @Update("UPDATE requestLog SET json=#{json} WHERE id=#{id}")
    int updateJson(@Param("id") Integer id, @Param("json") String json);

    @Delete("DELETE FROM requestLog WHERE id=#{id}")
    int deleteById(Integer id);
}
