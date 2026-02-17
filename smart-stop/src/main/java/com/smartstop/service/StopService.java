package com.smartstop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartstop.domain.Stop;
import com.smartstop.exception.StopNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Service
public class StopService {

    private static final String MBTA_STOP_URL_TEMPLATE = "https://api-v3.mbta.com/stops/{stopId}";
    private final RestTemplate restTemplate;

    public StopService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Stop getStopById(String stopId) {
        try {
            JsonNode response = restTemplate.getForObject(MBTA_STOP_URL_TEMPLATE, JsonNode.class, stopId);
            if (response == null || !response.has("data")) {
                throw new StopNotFoundException(stopId);
            }

            JsonNode data = response.path("data");
            JsonNode attributes = data.path("attributes");
            String id = data.path("id").asText();
            String name = attributes.path("name").asText(id);
            double latitude = attributes.path("latitude").asDouble();
            double longitude = attributes.path("longitude").asDouble();

            return new Stop(id, name, latitude, longitude);
        } catch (HttpClientErrorException.NotFound e) {
            throw new StopNotFoundException(stopId);
        }
    }
}
