package com.smartstop.dto;

import java.time.LocalDateTime;

public class ArrivalResponse {

    private final String busId;
    private final String stopId;
    private final long estimatedArrivalSeconds;
    private final LocalDateTime estimatedArrivalTime;

    public ArrivalResponse(
            String busId,
            String stopId,
            long estimatedArrivalSeconds,
            LocalDateTime estimatedArrivalTime
    ) {
        this.busId = busId;
        this.stopId = stopId;
        this.estimatedArrivalSeconds = estimatedArrivalSeconds;
        this.estimatedArrivalTime = estimatedArrivalTime;
    }

    public String getBusId() {
        return busId;
    }

    public String getStopId() {
        return stopId;
    }

    public long getEstimatedArrivalSeconds() {
        return estimatedArrivalSeconds;
    }

    public LocalDateTime getEstimatedArrivalTime() {
        return estimatedArrivalTime;
    }
}
