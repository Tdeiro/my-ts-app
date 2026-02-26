package com.playplanner.play_be_poc.model.classes;

import java.time.LocalDateTime;
import java.time.LocalTime;

import com.playplanner.play_be_poc.enums.ClassDay;
import com.playplanner.play_be_poc.enums.ClassLevel;
import com.playplanner.play_be_poc.enums.ClassStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "classes")
@Data
@NoArgsConstructor
public class ClassItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private Long userId;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String title;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String coach;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "day", nullable = false)
    private ClassDay day;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassLevel level;

    @Column(nullable = false)
    private Integer students;

    @NotNull
    @Column(nullable = false)
    private Integer capacity;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassStatus status;

    @Column(length = 255)
    private String location;

    @Column(name = "last_updated_by", length = 150)
    private String lastUpdatedBy;

    @Column(name = "last_updated_date", nullable = false)
    private LocalDateTime lastUpdatedDate = LocalDateTime.now();
}

