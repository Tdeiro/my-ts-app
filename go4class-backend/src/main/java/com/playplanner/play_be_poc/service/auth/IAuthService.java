package com.playplanner.play_be_poc.service.auth;

import com.playplanner.play_be_poc.dto.login.JwtResponse;
import com.playplanner.play_be_poc.dto.login.SignInDto;
import com.playplanner.play_be_poc.dto.login.SignUpDto;

public interface IAuthService {
    JwtResponse registerUser(SignUpDto signUpDto);
    JwtResponse authenticateUser(SignInDto signInDto);

}
