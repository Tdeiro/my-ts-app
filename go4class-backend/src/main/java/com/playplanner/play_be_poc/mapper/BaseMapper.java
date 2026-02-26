package com.playplanner.play_be_poc.mapper;

import java.util.List;

import org.mapstruct.MappingTarget;

public interface BaseMapper<E, D> {

    D toDto(E entity);

    E toEntity(D dto);

    List<D> toDtoList(List<E> entities);

    void updateEntityFromDto(D dto, @MappingTarget E entity);

}
