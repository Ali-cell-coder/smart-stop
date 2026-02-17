package com.smartstop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartstop.domain.ArrivalEstimate;
import com.smartstop.domain.BusLocation;
import com.smartstop.domain.Stop;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ArrivalService {

    private static final String ROUTES_BY_STOP_URL = "https://api-v3.mbta.com/routes?filter[stop]={stopId}";
    private static final String VEHICLES_URL = "https://api-v3.mbta.com/vehicles";

    private final RestTemplate restTemplate;
    private final StopService stopService;

    public ArrivalService(RestTemplate restTemplate, StopService stopService) {
        this.restTemplate = restTemplate;
        this.stopService = stopService;
    }

    public List<ArrivalEstimate> calculateArrivalsForStop(String stopId, Integer limit) {
        Stop stop = stopService.getStopById(stopId);
        Set<String> routeIds = getRouteIdsForStop(stopId);
        if (routeIds.isEmpty()) {
            return List.of();
        }

        List<BusLocation> vehicles = getVehiclesForRoutes(routeIds);
        List<ArrivalEstimate> estimates = new ArrayList<>();

        for (BusLocation location : vehicles) {
            double distanceKm = calculateDistanceKm(
                    stop.getLatitude(),
                    stop.getLongitude(),
                    location.getLatitude(),
                    location.getLongitude()
            );

            double speedKmh;
            if (distanceKm < 1) {
                speedKmh = 20;
            } else if (distanceKm < 5) {
                speedKmh = 30;
            } else {
                speedKmh = 40;
            }

            double arrivalSecondsDouble = (distanceKm / speedKmh) * 3600;
            long arrivalSeconds = Math.round(arrivalSecondsDouble);
            if (arrivalSeconds < 1) {
                arrivalSeconds = 1;
            }

            ArrivalEstimate estimate = new ArrivalEstimate(
                    location.getBusId(),
                    stop.getId(),
                    arrivalSeconds,
                    LocalDateTime.now()
            );
            estimates.add(estimate);
        }

        estimates.sort(Comparator.comparingLong(ArrivalEstimate::getEstimatedArrivalSeconds));
        if (limit != null && limit < estimates.size()) {
            return estimates.subList(0, limit);
        }
        return estimates;
    }

    public List<BusLocation> getAllLiveVehicles() {
        return getVehiclesForRoutes(null);
    }

    private Set<String> getRouteIdsForStop(String stopId) {
        Set<String> routeIds = new HashSet<>();
        JsonNode response = restTemplate.getForObject(ROUTES_BY_STOP_URL, JsonNode.class, stopId);
        if (response == null || !response.has("data")) {
            return routeIds;
        }

        for (JsonNode routeNode : response.path("data")) {
            String routeId = routeNode.path("id").asText();
            if (!routeId.isBlank()) {
                routeIds.add(routeId);
            }
        }
        return routeIds;
    }

    private List<BusLocation> getVehiclesForRoutes(Set<String> routeIds) {
        List<BusLocation> vehicles = new ArrayList<>();
        JsonNode response = restTemplate.getForObject(VEHICLES_URL, JsonNode.class);
        if (response == null || !response.has("data")) {
            return vehicles;
        }

        for (JsonNode vehicleNode : response.path("data")) {
            String routeId = vehicleNode.path("relationships").path("route").path("data").path("id").asText();
            if (routeIds != null && !routeIds.contains(routeId)) {
                continue;
            }

            JsonNode attributes = vehicleNode.path("attributes");
            String busId = vehicleNode.path("id").asText();
            double latitude = attributes.path("latitude").asDouble();
            double longitude = attributes.path("longitude").asDouble();
            double speed = attributes.path("speed").asDouble(0.0);

            vehicles.add(new BusLocation(busId, latitude, longitude, speed));
        }

        return vehicles;
    }

    private double calculateDistanceKm(double lat1, double lon1,
                                       double lat2, double lon2) {

        final int EARTH_RADIUS_KM = 6371;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2)
                * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }
}

