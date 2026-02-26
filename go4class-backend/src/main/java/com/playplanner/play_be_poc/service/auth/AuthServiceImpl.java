package com.playplanner.play_be_poc.service.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.playplanner.play_be_poc.dto.login.JwtResponse;
import com.playplanner.play_be_poc.dto.login.SignInDto;
import com.playplanner.play_be_poc.dto.login.SignUpDto;
import com.playplanner.play_be_poc.exception.AuthenticationFailedException;
import com.playplanner.play_be_poc.exception.UserAlreadyExistsException;
import com.playplanner.play_be_poc.model.login.Role;
import com.playplanner.play_be_poc.model.login.User;
import com.playplanner.play_be_poc.repository.login.RoleRepository;
import com.playplanner.play_be_poc.repository.login.UserRepository;
import com.playplanner.play_be_poc.util.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;

@Service
@RequiredArgsConstructor
@Log
public class AuthServiceImpl implements IAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final RoleRepository roleRepository;

    @Override
    public JwtResponse registerUser(SignUpDto signUpDto) {
        // Check if user exists
        if (userRepository.findByEmail(signUpDto.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("User already exists with email: " + signUpDto.getEmail());
        }

        // Load role from database
        Role role = roleRepository.findById(
                signUpDto.getRoleId() != null ? signUpDto.getRoleId() : 1)
                .orElseThrow(() -> new AuthenticationFailedException("Role not found"));

        // Map DTO to entity
        User user = new User();
        user.setFullName(signUpDto.getFullName());
        user.setEmail(signUpDto.getEmail());
        user.setPhone(signUpDto.getPhone());
        user.setPasswordHash(passwordEncoder.encode(signUpDto.getPassword()));
        user.setRole(role);
        // lastUpdatedDate is auto-set in entity

        User userResp = userRepository.save(user);

        if (signUpDto.getBillingInfo()) {
            log.info("Criar Billing Info...");
        }

        // Generate JWT
        UserDetails userDetails = userDetailsService.loadUserByUsername(userResp.getEmail());
        String jwt = jwtUtil.generateToken(userDetails, userResp);

        return new JwtResponse(jwt);
    }

    @Override
    public JwtResponse authenticateUser(SignInDto signInDto) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(signInDto.getEmail(), signInDto.getPassword()));
        } catch (Exception ex) {
            throw new AuthenticationFailedException("Invalid email or password");
        }

        User userResp = userRepository.findByEmail(signInDto.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(userResp.getEmail());
        String jwt = jwtUtil.generateToken(userDetails, userResp);

        return new JwtResponse(jwt);
    }
}
