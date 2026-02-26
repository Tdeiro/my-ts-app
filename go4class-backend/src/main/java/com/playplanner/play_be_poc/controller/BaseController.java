package com.playplanner.play_be_poc.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.playplanner.play_be_poc.dto.JwtUser;

public abstract class BaseController {

    /** Get the current authenticated JwtUser from SecurityContext */
    protected JwtUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtUser)) {
            throw new IllegalStateException("User not authenticated");
        }
        return (JwtUser) auth.getPrincipal();
    }

    /** Shortcut to get current user ID */
    protected Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    /** Shortcut to get current user email */
    protected String getCurrentUserEmail() {
        return getCurrentUser().getEmail();
    }

    /** Shortcut to get current user email */
    protected String getCurrentUserFullName() {
        return getCurrentUser().getFullName();
    }
}
