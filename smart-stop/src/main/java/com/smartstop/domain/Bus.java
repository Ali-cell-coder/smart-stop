package com.smartstop.domain;

public class Bus {

    private final String id;
    private final String routeId;

    public Bus(String id, String routeId) {
        this.id = id;
        this.routeId = routeId;
    }

    public String getId() {
        return id;
    }

    public String getRouteId() {
        return routeId;
    }
}
