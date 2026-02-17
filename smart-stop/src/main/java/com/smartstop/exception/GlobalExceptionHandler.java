package com.smartstop.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(StopNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleStopNotFoundException(
            StopNotFoundException exception,
            HttpServletRequest request
    ) {
        Map<String, Object> body = Map.of(
                "error", exception.getMessage(),
                "status", HttpStatus.NOT_FOUND.value(),
                "timestamp", LocalDateTime.now(),
                "path", request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolationException(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationErrorBody(request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationErrorBody(request));
    }

    private Map<String, Object> validationErrorBody(HttpServletRequest request) {
        return Map.of(
                "error", "Validation failed",
                "status", HttpStatus.BAD_REQUEST.value(),
                "timestamp", LocalDateTime.now(),
                "path", request.getRequestURI()
        );
    }
}
