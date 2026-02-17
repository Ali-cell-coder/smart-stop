package com.smartstop.mapper;

import com.smartstop.domain.ArrivalEstimate;
import com.smartstop.dto.ArrivalResponse;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ArrivalMapper {

    public ArrivalResponse toResponse(ArrivalEstimate estimate) {
        long estimatedArrivalSeconds = estimate.getEstimatedArrivalSeconds();
        return new ArrivalResponse(
                estimate.getBusId(),
                estimate.getStopId(),
                estimatedArrivalSeconds,
                LocalDateTime.now().plusSeconds(estimatedArrivalSeconds)
        );
    }
}
