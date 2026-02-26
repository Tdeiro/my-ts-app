package com.playplanner.play_be_poc.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.playplanner.play_be_poc.model.login.User;
import com.playplanner.play_be_poc.repository.login.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * UserDetailsService implementation for JWT authentication.
 * Loads users from the database by email.
 */
@Service
@RequiredArgsConstructor
public class MyUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail()) // authentication identifier
                .password(user.getPasswordHash())
                .authorities(user.getRole().getName())
                .build();
    }

}