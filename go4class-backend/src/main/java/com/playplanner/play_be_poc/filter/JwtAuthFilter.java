package com.playplanner.play_be_poc.filter;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.playplanner.play_be_poc.dto.JwtUser;
import com.playplanner.play_be_poc.service.MyUserDetailsService;
import com.playplanner.play_be_poc.util.JwtUtil;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final MyUserDetailsService userDetailsService;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getServletPath();
        // Skip auth endpoints and H2 console
        return path.startsWith("/login/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {

            String jwt = null;
            Long userId = null;
            String email = null;
            String fullName = null;
            String role = null;

            // Extract JWT token
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {

                jwt = authorizationHeader.substring(7);

                // Extract user from JWT
                userId = jwtUtil.extractUserId(jwt);
                email = jwtUtil.extractUserEmail(jwt);
                fullName = jwtUtil.extractUserFullName(jwt);
                role = jwtUtil.extractUserRole(jwt);
            }

            // Validate JWT and set authentication
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Option 1: load user from DB if needed
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(email);

                if (jwtUtil.validateToken(jwt, userDetails)) {
                    // You can also create a custom JwtUser object
                    JwtUser jwtUser = new JwtUser(userId, email, fullName, role);

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            jwtUser,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role)) // single role
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }

            filterChain.doFilter(request, response);

        } catch (JwtException ex) {

            log.warn("JWT error: {}", ex.getMessage());
            SecurityContextHolder.clearContext();

            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("Invalid or expired JWT"));
            return;
        }

    }
}
