package com.smartstop.controller;

import com.smartstop.domain.ArrivalEstimate;
import com.smartstop.domain.BusLocation;
import com.smartstop.domain.Stop;
import com.smartstop.dto.ArrivalResponse;
import com.smartstop.mapper.ArrivalMapper;
import com.smartstop.service.ArrivalService;
import com.smartstop.service.StopService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1")
@Validated
public class StopController {

    private final ArrivalService arrivalService;
    private final ArrivalMapper arrivalMapper;
    private final StopService stopService;

    public StopController(ArrivalService arrivalService,
                          ArrivalMapper arrivalMapper,
                          StopService stopService) {
        this.arrivalService = arrivalService;
        this.arrivalMapper = arrivalMapper;
        this.stopService = stopService;
    }

    // 🔹 ETA endpoint
    @GetMapping("/stops/{stopId}/arrivals")
    public List<ArrivalResponse> getArrivalsForStop(
            @PathVariable
            @NotBlank
            @Pattern(regexp = "\\d+")
            String stopId,

            @RequestParam(required = false)
            @Min(1)
            @Max(50)
            Integer limit
    ) {

        List<ArrivalEstimate> estimates =
                arrivalService.calculateArrivalsForStop(stopId, limit);

        return estimates.stream()
                .map(arrivalMapper::toResponse)
                .toList();
    }

    // 🔹 Tüm araçlar
    @GetMapping("/vehicles")
    public List<BusLocation> getAllVehicles() {
        return arrivalService.getAllLiveVehicles();
    }

    // 🔹 Stop detay (HARİTA İÇİN GEREKLİ)
    @GetMapping("/stops/{stopId}")
    public Stop getStop(@PathVariable String stopId) {
        return stopService.getStopById(stopId);
    }
}
