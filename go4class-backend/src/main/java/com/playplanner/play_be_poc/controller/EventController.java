package com.playplanner.play_be_poc.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.playplanner.play_be_poc.dto.event.EventDto;
import com.playplanner.play_be_poc.service.event.EventService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
@Validated
@Tag(name = "Events", description = "CRUD endpoints for user events")
@SecurityRequirement(name = "bearerAuth")
public class EventController extends BaseController {

    private final EventService eventService;

    @GetMapping
    @Operation(summary = "List events", description = "Returns all events from the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Events returned successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<List<EventDto>> getAll() {
        return ResponseEntity.ok(eventService.getAllByUser(this.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get event by id", description = "Returns a single event from the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event returned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid event id"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<EventDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getById(id, this.getCurrentUserId()));
    }

    @PostMapping
    @Operation(summary = "Create event", description = "Creates a new event for the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<EventDto> create(@Valid @RequestBody EventDto dto) {
        EventDto response = eventService.create(dto, this.getCurrentUserId(), this.getCurrentUserFullName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update event", description = "Updates an existing event from the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Event updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<EventDto> update(@PathVariable Long id, @Valid @RequestBody EventDto dto) {
        EventDto response = eventService.update(id, dto, this.getCurrentUserId(), this.getCurrentUserEmail());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete event", description = "Deletes an event from the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Event deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid event id"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        eventService.delete(id, this.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
