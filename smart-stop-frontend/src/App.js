import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_BASE = "https://smart-stop-backend.onrender.com";

/* -------------------- Leaflet Fix -------------------- */

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [42.36, -71.05];

/* -------------------- Helpers -------------------- */

const getVehiclePosition = (vehicle) => {
  const lat = Number(vehicle?.latitude);
  const lng = Number(vehicle?.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
};

const getStopPosition = (stop, fallback) => {
  if (!stop) return null;

  const lat = Number(stop.latitude ?? stop.stopLatitude);
  const lng = Number(stop.longitude ?? stop.stopLongitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return fallback;
  return [lat, lng];
};

function MapFlyTo({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.setView(location, 15, { animate: true });
  }, [location, map]);

  return null;
}

/* -------------------- App -------------------- */

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stopId, setStopId] = useState("");
  const [etaList, setEtaList] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [etaError, setEtaError] = useState("");
  const [etaLoading, setEtaLoading] = useState(false);

  /* -------------------- Fetch Vehicles -------------------- */

  useEffect(() => {
    const controller = new AbortController();

    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/v1/vehicles`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        const data = await res.json();
        setVehicles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Failed to fetch vehicles");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
    return () => controller.abort();
  }, []);

  /* -------------------- Fetch ETA -------------------- */

  const handleGetEta = async () => {
    if (!stopId.trim()) {
      setEtaError("Please enter stop ID");
      return;
    }

    try {
      setEtaLoading(true);
      setEtaError("");

      const arrivalsRes = await fetch(
        `${API_BASE}/api/v1/stops/${encodeURIComponent(
          stopId.trim()
        )}/arrivals?limit=10`
      );

      const stopRes = await fetch(
        `${API_BASE}/api/v1/stops/${encodeURIComponent(stopId.trim())}`
      );

      if (!arrivalsRes.ok) {
        throw new Error("ETA request failed");
      }

      if (!stopRes.ok) {
        throw new Error("Stop not found");
      }

      const arrivals = await arrivalsRes.json();
      const stopData = await stopRes.json();

      setEtaList(Array.isArray(arrivals) ? arrivals : []);
      setSelectedStop(stopData);
    } catch (err) {
      setEtaError("Failed to fetch ETA");
      setEtaList([]);
      setSelectedStop(null);
    } finally {
      setEtaLoading(false);
    }
  };

  /* -------------------- Map Data -------------------- */

  const vehicleMarkers = vehicles
    .map((v) => ({
      vehicle: v,
      position: getVehiclePosition(v),
    }))
    .filter((v) => v.position);

  const mapCenter = vehicleMarkers[0]?.position ?? DEFAULT_CENTER;
  const stopLocation = getStopPosition(selectedStop, mapCenter);

  /* -------------------- UI -------------------- */

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <section style={{ height: "60%" }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyTo location={stopLocation} />

          {vehicleMarkers.map(({ vehicle, position }, i) => (
            <Marker key={vehicle.busId ?? i} position={position}>
              <Popup>
                Bus ID: {vehicle.busId}
                <br />
                Lat: {vehicle.latitude}
                <br />
                Lng: {vehicle.longitude}
              </Popup>
            </Marker>
          ))}

          {stopLocation && (
            <Marker position={stopLocation}>
              <Popup>Selected Stop: {stopId}</Popup>
            </Marker>
          )}
        </MapContainer>
      </section>

      <section style={{ padding: 20 }}>
        <h2>Get ETA</h2>

        <input
          value={stopId}
          onChange={(e) => setStopId(e.target.value)}
          placeholder="Enter stop ID"
        />

        <button onClick={handleGetEta} disabled={etaLoading}>
          {etaLoading ? "Loading..." : "Get ETA"}
        </button>

        {etaError && <p style={{ color: "red" }}>{etaError}</p>}

        <ul>
          {etaList.map((eta, i) => (
            <li key={i}>
              Bus: {eta.busId} — {eta.estimatedArrivalSeconds} sec
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;

