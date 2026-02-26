package com.playplanner.play_be_poc.model.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private Long userId;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String name;

    @NotBlank
    @Size(max = 50)
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType; // e.g., TOURNAMENT, RUN

    @Size(max = 50)
    private String sport;

    @Size(max = 50)
    private String format; // e.g., Singles, Doubles

    @Size(max = 50)
    private String level;

    @NotBlank
    @Size(max = 50)
    private String timezone;

    @Size(max = 150)
    @Column(name = "location_name")
    private String locationName;

    @Size(max = 255)
    private String address;

    @NotNull
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @Column(name = "registration_deadline")
    private LocalDate registrationDeadline;

    private Integer capacity;

    @Column(name = "entry_fee", precision = 10, scale = 2)
    private BigDecimal entryFee;

    @Size(max = 3)
    @Column(length = 3, columnDefinition = "CHAR(3)")
    private String currency = "AUD";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_public")
    private Boolean isPublic = true;

    @Column(name = "allow_waitlist")
    private Boolean allowWaitlist = false;

    @Column(name = "require_approval")
    private Boolean requireApproval = false;

    @Size(max = 150)
    @Column(name = "last_updated_by")
    private String lastUpdatedBy;

    @Column(name = "last_updated_date", nullable = false)
    private LocalDateTime lastUpdatedDate = LocalDateTime.now();
}
