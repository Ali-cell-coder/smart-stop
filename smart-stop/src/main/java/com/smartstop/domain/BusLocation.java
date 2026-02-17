package com.smartstop.domain;

public class BusLocation {

    private final String busId;
    private final double latitude;
    private final double longitude;
    private final double speed;

    public BusLocation(String busId, double latitude, double longitude, double speed) {
        this.busId = busId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.speed = speed;
    }

    public String getBusId() {
        return busId;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public double getSpeed() {
        return speed;
    }
}
