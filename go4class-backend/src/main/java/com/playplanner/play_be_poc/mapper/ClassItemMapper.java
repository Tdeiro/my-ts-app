package com.playplanner.play_be_poc.mapper;

import org.mapstruct.Mapper;

import com.playplanner.play_be_poc.dto.classes.ClassItemDto;
import com.playplanner.play_be_poc.model.classes.ClassItem;

@Mapper(componentModel = "spring")
public interface ClassItemMapper extends BaseMapper<ClassItem, ClassItemDto> {

}
