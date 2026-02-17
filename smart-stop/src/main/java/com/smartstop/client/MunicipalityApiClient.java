package com.smartstop.client;

import com.smartstop.domain.BusLocation;

import java.util.List;

public interface MunicipalityApiClient {

    List<BusLocation> getLiveBusLocations();
}
