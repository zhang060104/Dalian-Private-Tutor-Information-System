package com.daliantutor.config;

import com.daliantutor.mapper.OrderMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 定时任务：每天 00:00 清理投递简历阶段（status 0/1）超过 24 小时未确认的订单（物理删除）。
 */
@Component
public class OrderCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(OrderCleanupTask.class);

    private final OrderMapper orderMapper;

    public OrderCleanupTask(OrderMapper orderMapper) {
        this.orderMapper = orderMapper;
    }

    /** 每天 00:00 执行 */
    @Scheduled(cron = "0 0 0 * * *")
    public void cleanupExpiredDrafts() {
        try {
            LocalDateTime deadline = LocalDateTime.now().minusHours(24);
            int deleted = orderMapper.deleteExpiredDrafts(deadline);
            if (deleted > 0) {
                log.info("定时清理超时投递订单 {} 条（截止 {}）", deleted, deadline);
            }
        } catch (Exception e) {
            log.error("定时清理投递订单失败", e);
        }
    }
}
