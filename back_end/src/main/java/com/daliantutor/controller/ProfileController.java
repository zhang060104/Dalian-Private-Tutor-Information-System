package com.daliantutor.controller;

import com.daliantutor.common.ApiResponse;
import com.daliantutor.config.AuthInterceptor;
import com.daliantutor.dto.ProfileReviewSubmit;
import com.daliantutor.dto.ProfileReviewVO;
import com.daliantutor.service.ProfileReviewService;
import org.springframework.web.bind.annotation.*;

/**
 * 个人资料修改审核（老师 / 学生）：提交申请、查看我的待审、撤销申请
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileReviewService reviewService;

    public ProfileController(ProfileReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /** 我的待审申请（没有则 data 为 null） */
    @GetMapping("/review/mine")
    public ApiResponse<ProfileReviewVO> mine(
            @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
            @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int type = reviewService.typeOf(role);
        return ApiResponse.ok(reviewService.findMine(type, Integer.parseInt(userId)));
    }

    /** 提交资料修改申请 */
    @PostMapping("/review")
    public ApiResponse<ProfileReviewVO> submit(
            @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
            @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role,
            @RequestBody ProfileReviewSubmit body) {
        int type = reviewService.typeOf(role);
        return ApiResponse.ok(reviewService.submit(type, Integer.parseInt(userId), body));
    }

    /** 撤销申请 */
    @PostMapping("/review/{id}/cancel")
    public ApiResponse<Void> cancel(
            @PathVariable Integer id,
            @RequestAttribute(AuthInterceptor.ATTR_USER_ID) String userId,
            @RequestAttribute(AuthInterceptor.ATTR_ROLE) String role) {
        int type = reviewService.typeOf(role);
        reviewService.cancel(id, type, Integer.parseInt(userId));
        return ApiResponse.ok();
    }
}
