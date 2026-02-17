package com.smartstop.client;

import com.google.transit.realtime.GtfsRealtime;
import com.smartstop.domain.BusLocation;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Component
@Profile("mbta")
public class MbtaMunicipalityApiClient implements MunicipalityApiClient {

    private static final String BASE_URL =
            "https://cdn.mbta.com/realtime/VehiclePositions.pb";

    private final RestTemplate restTemplate;

    public MbtaMunicipalityApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public List<BusLocation> getLiveBusLocations() {
        try {
            byte[] response = restTemplate.getForObject(BASE_URL, byte[].class);

            if (response == null || response.length == 0) {
                return List.of();
            }

            GtfsRealtime.FeedMessage feed =
                    GtfsRealtime.FeedMessage.parseFrom(response);

            List<BusLocation> locations = new ArrayList<>();

            for (GtfsRealtime.FeedEntity entity : feed.getEntityList()) {
                if (!entity.hasVehicle()) continue;

                GtfsRealtime.VehiclePosition vehicle = entity.getVehicle();

                if (!vehicle.hasPosition()) continue;

                locations.add(new BusLocation(
                        vehicle.getVehicle().getId(),
                        vehicle.getPosition().getLatitude(),
                        vehicle.getPosition().getLongitude(),
                        vehicle.getPosition().hasSpeed()
                                ? vehicle.getPosition().getSpeed()
                                : 0.0
                ));
            }

            return locations;

        } catch (Exception e) {
            return List.of();
        }
    }
}
