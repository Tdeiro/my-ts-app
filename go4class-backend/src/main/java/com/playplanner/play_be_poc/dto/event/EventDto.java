package com.playplanner.play_be_poc.dto.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Event payload")
public class EventDto {

    @Schema(description = "Event id", example = "1", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @Schema(description = "Owner user id", example = "10", accessMode = Schema.AccessMode.READ_ONLY)
    private Long userId;

    @NotBlank
    @Size(max = 150)
    @Schema(description = "Event name", example = "Sunday Tournament")
    private String name;

    @NotBlank
    @Size(max = 50)
    @Schema(description = "Event type", example = "TOURNAMENT")
    private String eventType;

    @Size(max = 50)
    @Schema(description = "Sport", example = "TENNIS")
    private String sport;

    @Size(max = 50)
    @Schema(description = "Format", example = "Singles")
    private String format;

    @Size(max = 50)
    @Schema(description = "Level", example = "Intermediate")
    private String level;

    @NotBlank
    @Size(max = 50)
    @Schema(description = "Time zone", example = "Australia/Sydney")
    private String timezone;

    @Size(max = 150)
    @Schema(description = "Location name", example = "Central Club")
    private String locationName;

    @Size(max = 255)
    @Schema(description = "Address", example = "123 Main St, Sydney")
    private String address;

    @NotNull
    @Schema(description = "Start date", example = "2026-03-01")
    private LocalDate startDate;
    @Schema(description = "End date", example = "2026-03-02")
    private LocalDate endDate;
    @Schema(description = "Start time", example = "09:00:00")
    private LocalTime startTime;
    @Schema(description = "End time", example = "18:00:00")
    private LocalTime endTime;

    @Schema(description = "Registration deadline", example = "2026-02-27")
    private LocalDate registrationDeadline;
    @Schema(description = "Maximum participants", example = "64")
    private Integer capacity;
    @Schema(description = "Entry fee", example = "50.00")
    private BigDecimal entryFee;

    @Size(max = 3)
    @Schema(description = "Currency code", example = "AUD")
    private String currency;

    @Schema(description = "Event description", example = "Open tournament for all levels")
    private String description;

    @Schema(description = "Whether event is public", example = "true")
    private Boolean isPublic;
    @Schema(description = "Whether waitlist is enabled", example = "false")
    private Boolean allowWaitlist;
    @Schema(description = "Whether participant approval is required", example = "false")
    private Boolean requireApproval;

    @Schema(description = "Last updated by", example = "admin@playplanner.com", accessMode = Schema.AccessMode.READ_ONLY)
    private String lastUpdatedBy;
    @Schema(description = "Last update date-time", example = "2026-02-15T11:30:00", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime lastUpdatedDate;
}
