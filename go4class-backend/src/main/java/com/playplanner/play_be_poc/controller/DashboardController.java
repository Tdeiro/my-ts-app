package com.playplanner.play_be_poc.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.playplanner.play_be_poc.dto.dashboard.DashboardResp;
import com.playplanner.play_be_poc.service.dashboard.DashboardService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard endpoints")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController extends BaseController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Get dashboard", description = "Returns dashboard data for the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dashboard returned successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public DashboardResp getDashboard(Authentication authentication) {

        System.out.println("User Id: " + this.getCurrentUserId());

        return dashboardService.getDashboard(this.getCurrentUserId());

    }

}
