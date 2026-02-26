package com.playplanner.play_be_poc.util;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.playplanner.play_be_poc.model.login.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    @Value("${jwt.secret:thisisasupersecretkeythatshouldbemorethan256bitslongforsecuritypurposes}")
    private String secret;

    // @Value("${jwt.expiration:3600000}") // 1 hour
    @Value("${jwt.expiration:28800000}") // 8 hours
    private Long expiration;

    /** Get the signing key for HS256 */
    private Key getSigningKey() {
        byte[] keyBytes = secret.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /** Generate token for a user */
    public String generateToken(UserDetails userDetails, User user) {
        Map<String, Object> claims = new HashMap<>();

        // Add role(s) dynamically
        claims.put("role", userDetails.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_NOT_FOUND"));

        // Add extra user info
        claims.put("id", user.getId());
        claims.put("fullName", user.getFullName());
        claims.put("email", user.getEmail());

        return createToken(claims, user.getEmail()); // keep subject as email
    }

    /** Create JWT token */
    private String createToken(Map<String, Object> claims, String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject) // still store email as sub
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Map<String, Object> extractUserClaims(String token) {
        return extractAllClaims(token);
    }

    public Long extractUserId(String token) {
        return ((Number) extractAllClaims(token).get("id")).longValue();
    }

    public String extractUserEmail(String token) {
        return (String) extractAllClaims(token).get("email");
    }

    public String extractUserFullName(String token) {
        return (String) extractAllClaims(token).get("fullName");
    }

    public String extractUserRole(String token) {
        return (String) extractAllClaims(token).get("role");
    }

    /** Validate token against user details */
    public boolean validateToken(String token, UserDetails userDetails) {
        final String email = extractUsername(token);
        return (email.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /** Extract email (subject) from token */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /** Extract expiration date */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /** Generic claim extractor */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /** Extract all claims from token */
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /** Check if token is expired */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
