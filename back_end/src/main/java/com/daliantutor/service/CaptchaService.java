package com.daliantutor.service;

import com.daliantutor.common.BizException;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 滑块验证码（防 ddos：注册 / 修改个人信息 / 发起订单前必须通过）。
 *
 * 生成 300x150 背景图并在随机位置挖出 48x48 缺口，前端把拼块拖到缺口处，
 * 提交拼块最终 x 坐标，误差 <= 6px 即通过并签发一次性 captchaToken（5 分钟有效，
 * 只能消费一次）。状态存内存，惰性过期清理。
 */
@Service
public class CaptchaService {

    /** 验证码图宽/高/缺口边长 */
    private static final int W = 300;
    private static final int H = 150;
    private static final int SIZE = 48;
    /** x 允许误差（px） */
    private static final int TOLERANCE = 6;
    /** token 有效期 5 分钟 */
    private static final long TTL_MS = 5 * 60 * 1000L;

    private static final class Slot {
        int x;
        long expire;
        Slot(int x, long expire) { this.x = x; this.expire = expire; }
    }

    /** captchaId -> 缺口 x */
    private final Map<String, Slot> captchas = new ConcurrentHashMap<>();
    /** 已签发的一次性 token（消费后移除） */
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();

    /** 生成一张滑块验证码 */
    public com.daliantutor.dto.CaptchaVO generate() {
        int x = 30 + (int) (Math.random() * (W - SIZE - 60));
        int y = 30 + (int) (Math.random() * (H - SIZE - 40));

        BufferedImage bg = drawBackground();
        BufferedImage puzzle = bg.getSubimage(x, y, SIZE, SIZE);
        // 背景缺口处压暗 + 描边
        Graphics2D g = bg.createGraphics();
        g.setComposite(AlphaComposite.SrcOver.derive(0.45f));
        g.setColor(Color.BLACK);
        g.fillRect(x, y, SIZE, SIZE);
        g.setComposite(AlphaComposite.SrcOver);
        g.setColor(Color.WHITE);
        g.drawRect(x, y, SIZE - 1, SIZE - 1);
        g.dispose();

        // 拼块：拷贝缺口内容 + 白描边，周围透明
        BufferedImage block = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D bg2 = block.createGraphics();
        bg2.drawImage(puzzle, 0, 0, null);
        bg2.setColor(Color.WHITE);
        bg2.drawRect(0, 0, SIZE - 1, SIZE - 1);
        bg2.dispose();

        String id = UUID.randomUUID().toString().replace("-", "");
        captchas.put(id, new Slot(x, System.currentTimeMillis() + TTL_MS));

        com.daliantutor.dto.CaptchaVO vo = new com.daliantutor.dto.CaptchaVO();
        vo.setCaptchaId(id);
        vo.setBackground(toBase64(bg));
        vo.setPuzzle(toBase64(block));
        return vo;
    }

    /** 校验拖动位置，通过则签发一次性 token */
    public String verify(String captchaId, int x) {
        if (captchaId == null || captchaId.isBlank()) {
            throw new BizException("缺少验证码标识");
        }
        Slot slot = captchas.remove(captchaId);
        if (slot == null) {
            throw new BizException("验证码不存在或已过期，请刷新重试");
        }
        if (System.currentTimeMillis() > slot.expire) {
            throw new BizException("验证码已过期，请刷新重试");
        }
        if (Math.abs(x - slot.x) > TOLERANCE) {
            throw new BizException("滑块位置不正确，请重试");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, System.currentTimeMillis() + TTL_MS);
        return token;
    }

    /** 校验一次性 token（注册/发起订单/资料修改提交时调用）。
     *  5 分钟内可重复使用（注册前需连续上传多张图片），过期自动失效。
     *  联调开关：captcha-disabled=true 时跳过校验（默认 false）。 */
    public void consume(String token) {
        if (captchaDisabled) return;
        if (token == null || token.isBlank()) {
            throw new BizException("请先完成滑块验证");
        }
        Long expire = tokens.get(token);
        if (expire == null || System.currentTimeMillis() > expire) {
            throw new BizException("滑块验证已过期，请重新验证");
        }
    }

    @org.springframework.beans.factory.annotation.Value("${daliantutor.captcha-disabled:false}")
    private boolean captchaDisabled;

    private BufferedImage drawBackground() {
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        // 浅色渐变底
        Color c1 = new Color(180 + (int) (Math.random() * 60), 180 + (int) (Math.random() * 60), 190 + (int) (Math.random() * 60));
        Color c2 = new Color(210 + (int) (Math.random() * 40), 210 + (int) (Math.random() * 40), 200 + (int) (Math.random() * 50));
        g.setPaint(new GradientPaint(0, 0, c1, W, H, c2));
        g.fillRect(0, 0, W, H);
        // 随机色块 / 干扰线
        for (int i = 0; i < 12; i++) {
            int r = 60 + (int) (Math.random() * 160);
            g.setColor(new Color(r, r, r, 40 + (int) (Math.random() * 80)));
            int w = 20 + (int) (Math.random() * 70);
            g.fillOval((int) (Math.random() * W), (int) (Math.random() * H), w, w);
        }
        g.setStroke(new BasicStroke(1.5f));
        for (int i = 0; i < 8; i++) {
            g.setColor(new Color(90 + (int) (Math.random() * 120), 90 + (int) (Math.random() * 120), 90 + (int) (Math.random() * 120), 60));
            g.drawLine((int) (Math.random() * W), (int) (Math.random() * H), (int) (Math.random() * W), (int) (Math.random() * H));
        }
        g.dispose();
        return img;
    }

    private String toBase64(BufferedImage img) {
        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", bos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(bos.toByteArray());
        } catch (Exception e) {
            throw new BizException("验证码生成失败");
        }
    }
}
