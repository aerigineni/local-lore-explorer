import { MapContainer, TileLayer, useMapEvents, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { forwardRef, useImperativeHandle } from "react";

interface MapMarker {
  lat: number;
  lng: number;
  name: string;
}

interface MapViewProps {
  onLocationClick: (lat: number, lng: number) => void;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}

export interface MapViewHandle {
  resetView: () => void;
}

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onLocationClick }: { onLocationClick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      map.flyTo(e.latlng, Math.max(map.getZoom(), 6), { duration: 1.2 });
      onLocationClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ mapRef }: { mapRef: React.Ref<MapViewHandle> }) {
  const map = useMap();
  useImperativeHandle(mapRef, () => ({
    resetView: () => {
      map.flyTo([20, 0], 3, { duration: 1.5 });
    },
  }));
  return null;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ onLocationClick, markers = [], onMarkerClick }, ref) => {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      minZoom={2}
      maxZoom={18}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onLocationClick={onLocationClick} />
      <MapController mapRef={ref} />
      {markers.map((m, i) => (
        <Marker
          key={`${m.name}-${i}`}
          position={[m.lat, m.lng]}
          icon={redIcon}
          eventHandlers={{
            click: () => onMarkerClick?.(m),
          }}
        >
          <Popup>{m.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

MapView.displayName = "MapView";

export default MapView;
