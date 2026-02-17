package com.smartstop.client;

import com.google.transit.realtime.GtfsRealtime;
import com.smartstop.domain.BusLocation;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Component
@Profile("helsinki")
public class HelsinkiMunicipalityApiClient implements MunicipalityApiClient {

    private static final String BASE_URL = "https://api.digitransit.fi/realtime/vehicle-positions/v1/gtfsrt";

    private final RestTemplate restTemplate;

    public HelsinkiMunicipalityApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public List<BusLocation> getLiveBusLocations() {
        try {
            byte[] response = restTemplate.getForObject(BASE_URL, byte[].class);
            if (response == null || response.length == 0) {
                return List.of();
            }

            GtfsRealtime.FeedMessage feedMessage = GtfsRealtime.FeedMessage.parseFrom(response);
            System.out.println("Vehicles count: " + feedMessage.getEntityCount());
            List<BusLocation> locations = new ArrayList<>();

            for (GtfsRealtime.FeedEntity entity : feedMessage.getEntityList()) {
                System.out.println("Entity ID: " + entity.getId());
                if (!entity.hasVehicle()) {
                    continue;
                }

                GtfsRealtime.VehiclePosition vehicle = entity.getVehicle();
                String busId = vehicle.getVehicle().getId();
                double latitude = vehicle.getPosition().getLatitude();
                double longitude = vehicle.getPosition().getLongitude();
                double speed = vehicle.getPosition().hasSpeed() ? vehicle.getPosition().getSpeed() : 0.0;

                locations.add(new BusLocation(busId, latitude, longitude, speed));
            }

            return locations;
        } catch (Exception e) {
            return List.of();
        }
    }
}
