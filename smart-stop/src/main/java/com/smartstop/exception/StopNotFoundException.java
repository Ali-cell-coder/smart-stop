package com.smartstop.exception;

public class StopNotFoundException extends RuntimeException {

    public StopNotFoundException(String stopId) {
        super("Stop not found with id: " + stopId);
    }
}
