package com.playplanner.play_be_poc.model.login;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "billing_info")
@Data
@NoArgsConstructor
public class BillingInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @NotBlank
    @Size(min = 11, max = 11)
    @Column(name = "abn_number", nullable = false, length = 11)
    private String abnNumber;

    @NotBlank
    @Size(max = 150)
    @Column(name = "business_name", nullable = false, length = 150)
    private String businessName;

    @NotBlank
    @Size(max = 50)
    @Column(name = "bank_name", nullable = false, length = 50)
    private String bankName;

    @NotBlank
    @Size(min = 6, max = 6)
    @Column(name = "bsb", nullable = false, length = 6)
    private String bsb;

    @NotBlank
    @Size(max = 20)
    @Column(name = "account_number", nullable = false, length = 20)
    private String accountNumber;

    @Column(name = "last_updated_date", nullable = false)
    private LocalDateTime lastUpdatedDate = LocalDateTime.now();
}
