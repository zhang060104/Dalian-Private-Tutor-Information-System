package com.daliantutor.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 密码工具：注册用 BCrypt 哈希存储；登录兼容种子数据的明文密码
 */
public final class PasswordUtil {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    private PasswordUtil() {
    }

    /** 注册时加密存储 */
    public static String encode(String raw) {
        return ENCODER.encode(raw);
    }

    /** 校验：存储值为 BCrypt（$2 开头）则 BCrypt 比对，否则明文比对（兼容演示种子数据） */
    public static boolean matches(String raw, String stored) {
        if (stored == null) {
            return false;
        }
        if (stored.startsWith("$2")) {
            try {
                return ENCODER.matches(raw, stored);
            } catch (Exception e) {
                return false;
            }
        }
        return stored.equals(raw);
    }
}
