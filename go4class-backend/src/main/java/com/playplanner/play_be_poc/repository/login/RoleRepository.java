package com.playplanner.play_be_poc.repository.login;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.playplanner.play_be_poc.model.login.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

}
