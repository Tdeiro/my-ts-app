package com.playplanner.play_be_poc.service.event;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.playplanner.play_be_poc.dto.event.EventDto;
import com.playplanner.play_be_poc.exception.GeneralValidationException;
import com.playplanner.play_be_poc.mapper.EventMapper;
import com.playplanner.play_be_poc.model.event.Event;
import com.playplanner.play_be_poc.repository.event.EventRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final EventMapper eventMapper;

    public List<EventDto> getAllByUser(Long userId) {
        return eventMapper.toDtoList(eventRepository.findByUserId(userId));
    }

    public EventDto getById(Long id, Long userId) {

        Event event = findByIdAndUser(id, userId);
        return eventMapper.toDto(event);

    }

    public EventDto create(EventDto dto, Long userId, String updatedBy) {

        log.info("****************** CREATE ***************");
        log.info("Dto: {}", dto.toString());
        log.info("UserId: {} ", userId);
        log.info("updatedBy: {} ", updatedBy);

        Event event = eventMapper.toEntity(dto);
        event.setUserId(userId);
        event.setLastUpdatedBy(updatedBy);
        event.setLastUpdatedDate(LocalDateTime.now());

        return eventMapper.toDto(eventRepository.save(event));
    }

    public EventDto update(Long id, EventDto dto, Long userId, String updatedBy) {
        Event event = findByIdAndUser(id, userId);
        eventMapper.updateEntityFromDto(dto, event);
        event.setLastUpdatedBy(updatedBy);
        event.setLastUpdatedDate(LocalDateTime.now());

        log.info("****************** UPDATE ***************");
        log.info("Dto: {}", dto.toString());
        log.info("UserId: {} ", userId);
        log.info("updatedBy: {} ", updatedBy);

        return eventMapper.toDto(eventRepository.save(event));
    }

    public void delete(Long id, Long userId) {
        Event event = findByIdAndUser(id, userId);
        eventRepository.delete(event);
    }

    private Event findByIdAndUser(Long id, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new GeneralValidationException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new GeneralValidationException("You do not have access to this event");
        }

        return event;
    }
}
