import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [41.0082, 28.9784];
const redStopIcon = new L.Icon({
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getVehiclePosition = (vehicle) => {
  const latitude = Number(vehicle?.latitude);
  const longitude = Number(vehicle?.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }
  return [latitude, longitude];
};

const getStopPosition = (selectedStop, fallbackCenter) => {
  const candidate = selectedStop;
  if (!candidate) {
    return null;
  }

  const latitude = Number(
    candidate.stopLatitude ?? candidate.stopLat ?? candidate.latitude
  );
  const longitude = Number(
    candidate.stopLongitude ?? candidate.stopLng ?? candidate.longitude
  );

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return fallbackCenter;
  }
  return [latitude, longitude];
};

function MapFlyTo({ stopLocation, hasZoomed, setHasZoomed }) {
  const map = useMap();

  useEffect(() => {
    if (!stopLocation || hasZoomed) {
      return;
    }

    map.setView(stopLocation, 15, {
      animate: true,
      duration: 1.5,
    });
    setHasZoomed(true);
  }, [map, stopLocation, hasZoomed, setHasZoomed]);

  return null;
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stopId, setStopId] = useState("");
  const [etaList, setEtaList] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [hasZoomed, setHasZoomed] = useState(false);
  const [filteredVehicleIds, setFilteredVehicleIds] = useState(null);
  const [countdowns, setCountdowns] = useState({});
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState("");

  const getEtaColor = (seconds) => {
    const safeSeconds = Number(seconds);
    const totalSeconds = Number.isNaN(safeSeconds)
      ? 0
      : Math.max(0, Math.floor(safeSeconds));

    if (totalSeconds <= 0) {
      return "gray";
    }
    if (totalSeconds <= 300) {
      return "green";
    }
    if (totalSeconds <= 900) {
      return "orange";
    }
    return "red";
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("https://smart-stop-backend.onrender.com/api/v1/vehicles", {

          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setVehicles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to fetch vehicles.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns((prevCountdowns) => {
        if (Object.keys(prevCountdowns).length === 0) {
          return prevCountdowns;
        }

        const nextCountdowns = {};
        Object.entries(prevCountdowns).forEach(([busId, seconds]) => {
          nextCountdowns[busId] = Math.max(0, (seconds ?? 0) - 1);
        });
        return nextCountdowns;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGetEta = async () => {
    if (!stopId.trim()) {
      setEtaError("Please enter a stopId.");
      setEtaList([]);
      setSelectedStop(null);
      setHasZoomed(false);
      setCountdowns({});
      setFilteredVehicleIds(null);
      return;
    }

    try {
      setEtaLoading(true);
      setEtaError("");
      setHasZoomed(false);
      setSelectedStop(null);

      const arrivalsResponse = await fetch(
        `http://localhost:8080/api/v1/stops/${encodeURIComponent(
          stopId.trim()
        )}/arrivals?limit=10`
      );
      const stopResponse = await fetch(
        `http://localhost:8080/api/v1/stops/${encodeURIComponent(stopId.trim())}`
      );

      if (!arrivalsResponse.ok) {
        throw new Error(
          `ETA request failed with status ${arrivalsResponse.status}`
        );
      }
      if (!stopResponse.ok) {
        throw new Error(
          `Stop request failed with status ${stopResponse.status}`
        );
      }

      const data = await arrivalsResponse.json();
      const stopData = await stopResponse.json();
      const etaItems = Array.isArray(data) ? data : [];
      const etaBusIds = [
        ...new Set(
          etaItems
            .map((eta) => eta?.busId)
            .filter((busId) => busId !== null && busId !== undefined)
        ),
      ];
      const initialCountdowns = etaItems.reduce((acc, eta) => {
        if (eta?.busId == null) {
          return acc;
        }
        acc[eta.busId] = Math.max(0, Number(eta.estimatedArrivalSeconds) || 0);
        return acc;
      }, {});

      setEtaList(etaItems);
      setSelectedStop(stopData);
      setFilteredVehicleIds(etaBusIds);
      setCountdowns(initialCountdowns);
    } catch (err) {
      setEtaError(err.message || "Failed to fetch ETA list.");
      setEtaList([]);
      setSelectedStop(null);
      setHasZoomed(false);
      setCountdowns({});
      setFilteredVehicleIds(null);
    } finally {
      setEtaLoading(false);
    }
  };

  const vehiclesToShow =
    filteredVehicleIds === null
      ? vehicles
      : vehicles.filter((vehicle) =>
          filteredVehicleIds.includes(vehicle?.busId) ||
          filteredVehicleIds.includes(String(vehicle?.busId))
        );

  const vehicleMarkers = vehiclesToShow
    .map((vehicle, index) => ({
      vehicle,
      index,
      position: getVehiclePosition(vehicle),
    }))
    .filter((item) => item.position);

  const mapCenter = vehicleMarkers[0]?.position ?? DEFAULT_CENTER;
  const stopLocation = getStopPosition(selectedStop, mapCenter);

  return (
    <main
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        width: "100vw",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <section
        style={{
          width: "100%",
          height: "58vh",
          minHeight: "55vh",
          overflow: "hidden",
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          marginBottom: "1rem",
        }}
      >
   <MapContainer
  center={[42.36, -71.05]}
  zoom={12}
  minZoom={3}
  maxZoom={20}
  scrollWheelZoom={true}
  style={{ height: "100%", width: "100%" }}
>

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo
              stopLocation={stopLocation}
              hasZoomed={hasZoomed}
              setHasZoomed={setHasZoomed}
            />

            {vehicleMarkers.map(({ vehicle, index, position }) => (
              <Marker key={vehicle.busId ?? index} position={position}>
                <Popup>
                  <div>
                    <div>
                      <strong>Bus ID:</strong> {vehicle.busId ?? "N/A"}
                    </div>
                    <div>
                      <strong>Latitude:</strong> {vehicle.latitude ?? "N/A"}
                    </div>
                    <div>
                      <strong>Longitude:</strong> {vehicle.longitude ?? "N/A"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {stopLocation && (
              <Marker position={stopLocation} icon={redStopIcon}>
                <Popup>
                  <div>
                    <div>
                      <strong>Selected Stop:</strong> {selectedStop?.id ?? stopId}
                    </div>
                    <div>
                      <strong>Latitude:</strong>{" "}
                      {selectedStop?.latitude ?? selectedStop?.stopLatitude ?? "N/A"}
                    </div>
                    <div>
                      <strong>Longitude:</strong>{" "}
                      {selectedStop?.longitude ?? selectedStop?.stopLongitude ?? "N/A"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
      </section>
      <section
        style={{
          display: "flex",
          gap: "1.25rem",
          alignItems: "stretch",
          width: "100%",
          minHeight: "40vh",
          flex: 1,
          padding: "0 1rem 1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 420px",
            background: "rgba(15, 23, 42, 0.55)",
            borderRadius: "16px",
            padding: "1.25rem",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            overflowY: "auto",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Vehicles</h1>
          {loading && <p>Loading vehicles...</p>}
          {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}
          {!loading && vehicles.length === 0 && <p>No vehicles found.</p>}
          {!loading && vehicles.length > 0 && (
            <ul style={{ paddingLeft: "1.1rem", marginTop: 0 }}>
              {vehicles.map((vehicle, index) => (
                <li key={vehicle.busId ?? index}>
                  <strong>busId:</strong> {vehicle.busId} |{" "}
                  <strong>latitude:</strong> {vehicle.latitude} |{" "}
                  <strong>longitude:</strong> {vehicle.longitude}
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside
          style={{
            flex: "1 1 420px",
            background: "rgba(15, 23, 42, 0.55)",
            borderRadius: "16px",
            padding: "1.25rem",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            overflowY: "auto",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Get ETA</h2>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              placeholder="Enter stop ID"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #334155",
                fontSize: "14px",
                background: "#0f172a",
                color: "white",
                outline: "none",
              }}
            />

            <button
              onClick={handleGetEta}
              disabled={etaLoading}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: 600,
                cursor: etaLoading ? "not-allowed" : "pointer",
                opacity: etaLoading ? 0.8 : 1,
              }}
            >
              {etaLoading ? "Loading..." : "Get ETA"}
            </button>
          </div>

          {etaError && <p style={{ color: "#f87171" }}>Error: {etaError}</p>}

          {etaList.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {etaList.slice(0, 10).map((eta, index) => {
                const secs =
                  countdowns[eta.busId] ??
                  Math.max(0, Number(eta.estimatedArrivalSeconds) || 0);
                const arrived = secs <= 0;

                return (
                  <li
                    key={eta.busId ?? index}
                    style={{
                      background: "#1e293b",
                      borderRadius: "16px",
                      padding: "1.2rem",
                      marginBottom: "1rem",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                      Bus ID: {eta.busId}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "1.2rem",
                        fontWeight: 600,
                        color: getEtaColor(secs),
                      }}
                    >
                      {arrived
                        ? "Arrived"
                        : `${Math.floor(secs / 60)} min ${secs % 60} sec`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;

