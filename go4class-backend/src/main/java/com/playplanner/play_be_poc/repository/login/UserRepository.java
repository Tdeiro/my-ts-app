package com.playplanner.play_be_poc.repository.login;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.playplanner.play_be_poc.model.login.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by email (used for login and signup checks)
    Optional<User> findByEmail(String email);

    // Optional: find by full name
    Optional<User> findByFullName(String fullName);
}
