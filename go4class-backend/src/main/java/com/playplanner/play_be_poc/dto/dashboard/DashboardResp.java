package com.playplanner.play_be_poc.dto.dashboard;

import java.util.List;
import java.util.Optional;

import com.playplanner.play_be_poc.dto.classes.ClassItemDto;
import com.playplanner.play_be_poc.dto.event.EventDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResp {

    private Optional<List<EventDto>> events;
    private Optional<List<ClassItemDto>> classes;

}
