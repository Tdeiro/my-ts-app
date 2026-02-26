package com.playplanner.play_be_poc.repository.classes;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.playplanner.play_be_poc.model.classes.ClassItem;

@Repository
public interface ClassItemRepository extends JpaRepository<ClassItem, Long> {

    // Find events by type (TOURNAMENT, RUN, etc.)
    List<ClassItem> findByUserId(Long userId);

}
