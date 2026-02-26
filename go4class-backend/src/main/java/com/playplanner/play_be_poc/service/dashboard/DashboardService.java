package com.playplanner.play_be_poc.service.dashboard;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.playplanner.play_be_poc.dto.classes.ClassItemDto;
import com.playplanner.play_be_poc.dto.dashboard.DashboardResp;
import com.playplanner.play_be_poc.dto.event.EventDto;
import com.playplanner.play_be_poc.exception.GeneralValidationException;
import com.playplanner.play_be_poc.mapper.ClassItemMapper;
import com.playplanner.play_be_poc.mapper.EventMapper;
import com.playplanner.play_be_poc.repository.classes.ClassItemRepository;
import com.playplanner.play_be_poc.repository.event.EventRepository;
import com.playplanner.play_be_poc.repository.login.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EventRepository eventRepository;
    private final ClassItemRepository classItemRepository;
    private final UserRepository userRepository;
    private final EventMapper eventMapper;
    private final ClassItemMapper classItemMapper;

    public DashboardResp getDashboard(long userId) {

        userRepository.findById(userId)
                .orElseThrow(() -> new GeneralValidationException("User not found"));

        // Map events to DTOs
        List<EventDto> events = eventMapper.toDtoList(eventRepository.findAll());

        // Map classes to DTOs
        List<ClassItemDto> classes = classItemMapper.toDtoList(classItemRepository.findAll());

        // Wrap in Optional and return
        return new DashboardResp(
                Optional.ofNullable(events),
                Optional.ofNullable(classes)
        );
    }
}
