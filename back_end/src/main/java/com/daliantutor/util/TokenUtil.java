package com.daliantutor.util;

import com.daliantutor.common.BizException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 登录令牌：HMAC-SHA256 签名，格式 base64(payload).base64(signature)
 * payload = userId:role:expireMillis
 */
public final class TokenUtil {

    private TokenUtil() {
    }

    private static String hmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new BizException("令牌签名失败");
        }
    }

    public static String issue(Integer userId, String role, long ttlHours, String secret) {
        long expire = System.currentTimeMillis() + ttlHours * 3600_000L;
        String payload = userId + ":" + role + ":" + expire;
        String body = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String sig = hmac(body, secret);
        return body + "." + sig;
    }

    /**
     * 校验并解析令牌，返回 [userId, role]
     */
    public static String[] verify(String token, String secret) {
        if (token == null || token.isEmpty()) {
            throw new BizException("未登录，请先登录");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            throw new BizException("令牌格式错误");
        }
        String expected = hmac(parts[0], secret);
        if (!constantTimeEquals(expected, parts[1])) {
            throw new BizException("令牌校验失败");
        }
        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new BizException("令牌解析失败");
        }
        String[] seg = payload.split(":");
        if (seg.length != 3) {
            throw new BizException("令牌内容错误");
        }
        long expire = Long.parseLong(seg[2]);
        if (System.currentTimeMillis() > expire) {
            throw new BizException("登录已过期，请重新登录");
        }
        return new String[]{seg[0], seg[1]};
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
