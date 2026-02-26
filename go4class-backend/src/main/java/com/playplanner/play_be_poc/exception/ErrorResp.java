package com.playplanner.play_be_poc.exception;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ErrorResp {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private List<String> message;
    private String path;
}
