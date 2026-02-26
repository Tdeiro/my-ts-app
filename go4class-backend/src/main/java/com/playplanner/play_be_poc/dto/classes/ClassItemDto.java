package com.playplanner.play_be_poc.dto.classes;

import java.time.LocalDateTime;
import java.time.LocalTime;

import com.playplanner.play_be_poc.enums.ClassDay;
import com.playplanner.play_be_poc.enums.ClassLevel;
import com.playplanner.play_be_poc.enums.ClassStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
@Schema(description = "Class item payload")
public class ClassItemDto {

    @Schema(description = "Class id", example = "1", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @Schema(description = "Owner user id", example = "10", accessMode = Schema.AccessMode.READ_ONLY)
    private Long userId;

    @NotBlank(message = "Title is required")
    @Schema(description = "Class title", example = "Morning Cardio")
    private String title;

    @NotBlank(message = "Coach name is required")
    @Schema(description = "Coach name", example = "Maria Santos")
    private String coach;

    @NotNull(message = "Day is required")
    @Schema(description = "Day of class", example = "MONDAY")
    private ClassDay day;

    @NotNull(message = "Start time is required")
    @Schema(description = "Start time", example = "08:00:00")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @Schema(description = "End time", example = "09:00:00")
    private LocalTime endTime;

    @NotNull(message = "Level is required")
    @Schema(description = "Class level", example = "BEGINNER")
    private ClassLevel level;

    @Positive(message = "Students must be >= 0")
    @Schema(description = "Current students", example = "12")
    private Integer students;

    @NotNull(message = "Capacity is required")
    @Positive(message = "Capacity must be greater than 0")
    @Schema(description = "Class capacity", example = "20")
    private Integer capacity;

    @NotNull(message = "Status is required")
    @Schema(description = "Class status", example = "OPEN")
    private ClassStatus status;

    @Schema(description = "Class location", example = "Court 2")
    private String location;

    @Schema(description = "Last updated by", example = "admin@playplanner.com", accessMode = Schema.AccessMode.READ_ONLY)
    private String lastUpdatedBy;
    @Schema(description = "Last update date-time", example = "2026-02-15T11:30:00", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime lastUpdatedDate;
}
