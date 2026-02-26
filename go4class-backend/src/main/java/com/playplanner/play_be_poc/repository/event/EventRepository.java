package com.playplanner.play_be_poc.repository.event;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.playplanner.play_be_poc.model.event.Event;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByUserId(Long userId);

    // Optional<Event> findByIdAndUserId(Long id, Long userId);

    // Find events by type (TOURNAMENT, RUN, etc.)
    List<Event> findByEventType(String eventType);

    // Find events by sport
    List<Event> findBySport(String sport);

    // Find events that start after a given date
    List<Event> findByStartDateAfter(LocalDate date);

    // Find events by type and start date
    List<Event> findByEventTypeAndStartDate(String eventType, LocalDate startDate);
}
