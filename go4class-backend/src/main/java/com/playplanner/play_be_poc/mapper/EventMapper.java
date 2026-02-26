package com.playplanner.play_be_poc.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.playplanner.play_be_poc.dto.event.EventDto;
import com.playplanner.play_be_poc.model.event.Event;

@Mapper(componentModel = "spring")
public interface EventMapper extends BaseMapper<Event, EventDto> {

    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "lastUpdatedBy", ignore = true)
    @Mapping(target = "lastUpdatedDate", ignore = true)
    Event toEntity(EventDto dto);

    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "lastUpdatedBy", ignore = true)
    @Mapping(target = "lastUpdatedDate", ignore = true)
    void updateEntityFromDto(EventDto dto, @MappingTarget Event entity);

}
