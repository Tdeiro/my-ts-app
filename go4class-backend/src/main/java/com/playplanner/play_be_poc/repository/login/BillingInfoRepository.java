package com.playplanner.play_be_poc.repository.login;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.playplanner.play_be_poc.model.login.BillingInfo;
import com.playplanner.play_be_poc.model.login.User;

@Repository
public interface BillingInfoRepository extends JpaRepository<BillingInfo, Long> {

    // Find billing info by user
    Optional<BillingInfo> findByUser(User user);

    // Optional: find by ABN number
    Optional<BillingInfo> findByAbnNumber(String abnNumber);
}
