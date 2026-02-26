package com.playplanner.play_be_poc.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.playplanner.play_be_poc.dto.login.JwtResponse;
import com.playplanner.play_be_poc.dto.login.SignInDto;
import com.playplanner.play_be_poc.dto.login.SignUpDto;
import com.playplanner.play_be_poc.service.auth.IAuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/login")
@RequiredArgsConstructor
@Validated
@Tag(name = "Authentication", description = "Authentication endpoints")
public class LoginController {

    private final IAuthService authService;

    @PostMapping("/signup")
    @Operation(summary = "Register user", description = "Registers a new user and returns a JWT token")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    public ResponseEntity<JwtResponse> registerUser(@Valid @RequestBody SignUpDto signUpDto) {
        // Delegate all logic to the service
        JwtResponse jwtResponse = authService.registerUser(signUpDto);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/signin")
    @Operation(summary = "Sign in", description = "Authenticates user and returns a JWT token")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Authenticated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid email or password")
    })
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody SignInDto signInDto) {
        // Delegate all logic to the service
        JwtResponse jwtResponse = authService.authenticateUser(signInDto);
        return ResponseEntity.ok(jwtResponse);
    }
}
