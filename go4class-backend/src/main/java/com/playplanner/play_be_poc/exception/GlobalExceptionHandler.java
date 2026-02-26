package com.playplanner.play_be_poc.exception;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@ControllerAdvice
public class GlobalExceptionHandler {

        // Handle validation errors from @Valid in DTOs
        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResp> handleValidationExceptions(
                        MethodArgumentNotValidException ex, WebRequest request) {

                List<String> errors = ex.getBindingResult().getFieldErrors()
                                .stream()
                                .map(FieldError::getDefaultMessage)
                                .toList();

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                "Validation Error",
                                errors,
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Handle your custom exception: UserAlreadyExistsException
        @ExceptionHandler(UserAlreadyExistsException.class)
        public ResponseEntity<ErrorResp> handleUserAlreadyExists(
                        UserAlreadyExistsException ex, WebRequest request) {

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                "Bad Request",
                                List.of(ex.getMessage()),
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Handle authentication failures
        @ExceptionHandler(AuthenticationFailedException.class)
        public ResponseEntity<ErrorResp> handleAuthenticationFailed(
                        AuthenticationFailedException ex, WebRequest request) {

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                "Authentication Failed",
                                List.of(ex.getMessage()),
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        @ExceptionHandler(GeneralValidationException.class)
        public ResponseEntity<ErrorResp> handleGeneralValidationFailed(
                        GeneralValidationException ex, WebRequest request) {

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.NOT_FOUND.value(),
                                "General Validation",
                                List.of(ex.getMessage()),
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        // Catch-all for unexpected exceptions
        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResp> handleAllExceptions(
                        Exception ex, WebRequest request) {

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                                "Internal Server Error",
                                List.of(ex.getMessage()),
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ErrorResp> handleNotFound(
                        ResourceNotFoundException ex, WebRequest request) {

                ErrorResp response = new ErrorResp(
                                LocalDateTime.now(),
                                HttpStatus.NOT_FOUND.value(),
                                "Not Found",
                                List.of(ex.getMessage()),
                                request.getDescription(false).replace("uri=", ""));

                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
}
