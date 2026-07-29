import { useEffect, useMemo, Fragment } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversineDistance } from '../utils/geoUtils';

// Free open-source satellite & map tile providers (no API key required)
const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar',
    maxZoom: 22,
    maxNativeZoom: 18,
  },
  esri_clarity: {
    url: 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/tile/1.0.0/World_Imagery/default/default028mm/{z}/{y}/{x}.jpg',
    attribution: 'Tiles &copy; Esri Clarity',
    maxZoom: 22,
    maxNativeZoom: 18,
  },
  google_sat: {
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Satellite',
    maxZoom: 22,
    maxNativeZoom: 19,
  },
  google_hybrid: {
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Hybrid',
    maxZoom: 22,
    maxNativeZoom: 19,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &mdash; OSM contributors',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
};

// Corner marker icon factory
function cornerIcon(sno, isTarget, isVerified) {
  const cls = isTarget ? 'target' : isVerified ? 'verified' : '';
  return L.divIcon({
    className: 'corner-marker-icon',
    html: `<div class="corner-marker ${cls}">${sno}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// User position icon
const userIcon = L.divIcon({
  className: 'corner-marker-icon',
  html: `<div class="user-marker"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Side label icon factory
function sideLabel(text) {
  return L.divIcon({
    className: '',
    html: `<div class="side-label">${text}</div>`,
    iconSize: [0, 0],
  });
}

// LP number label factory
function lpLabel(text) {
  return L.divIcon({
    className: '',
    html: `<div class="lp-label">LP ${text}</div>`,
    iconSize: [0, 0],
  });
}

// Map controller component — fits bounds on data change
function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 20 });
    }
  }, [map, bounds]);
  return null;
}

// Follow user position when navigating
function UserFollower({ userPosition, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && userPosition) {
      map.setView([userPosition.lat, userPosition.lon], map.getZoom(), { animate: true });
    }
  }, [map, userPosition, follow]);
  return null;
}

// Map click handler for adding points on click
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function MapView({
  plotData, targetPointIdx, userPosition, verifiedPoints, mapLayer, centroid, onSelectPoint, onMapClick
}) {
  const tile = TILE_LAYERS[mapLayer] || TILE_LAYERS.satellite;

  // Polygon positions
  const polygonPositions = useMemo(() => {
    return plotData.points.map(p => [p.lat, p.lon]);
  }, [plotData.points]);

  // Bounds for fitting
  const bounds = useMemo(() => {
    if (plotData.points.length === 0) return null;
    return L.latLngBounds(plotData.points.map(p => [p.lat, p.lon]));
  }, [plotData.points]);

  // Side segments: midpoints + labels
  const sideSegments = useMemo(() => {
    return plotData.points.map((pt, i) => {
      const next = plotData.points[(i + 1) % plotData.points.length];
      const dist = haversineDistance(pt.lat, pt.lon, next.lat, next.lon);
      const midLat = (pt.lat + next.lat) / 2;
      const midLon = (pt.lon + next.lon) / 2;
      // Offset LP label slightly perpendicular to the side
      const dLat = next.lat - pt.lat;
      const dLon = next.lon - pt.lon;
      const perpLat = midLat + dLon * 0.15;
      const perpLon = midLon - dLat * 0.15;
      return {
        from: [pt.lat, pt.lon],
        to: [next.lat, next.lon],
        mid: [midLat, midLon],
        perpMid: [perpLat, perpLon],
        distLabel: `${dist.toFixed(2)}m`,
        lpLabel: pt.sideLp || '',
      };
    });
  }, [plotData.points]);

  return (
    <MapContainer
      center={[centroid.lat, centroid.lon]}
      zoom={20}
      zoomControl={true}
      style={{ width: '100%', height: '100%' }}
    >
      {/* KEY prop forces tile layer swap when switching map types */}
      <TileLayer
        key={mapLayer}
        url={tile.url}
        attribution={tile.attribution}
        maxZoom={tile.maxZoom}
        maxNativeZoom={tile.maxNativeZoom}
      />
      <MapController bounds={bounds} />
      <UserFollower userPosition={userPosition} follow={!!userPosition} />
      <MapClickHandler onMapClick={onMapClick} />

      {/* Plot boundary polygon */}
      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: '#00ffcc',
          weight: 3,
          fillColor: '#00ffcc',
          fillOpacity: 0.1,
          dashArray: null,
        }}
      />

      {/* Side boundary lines with distance labels */}
      {sideSegments.map((seg, i) => (
        <Fragment key={`seg-${i}`}>
          <Polyline
            positions={[seg.from, seg.to]}
            pathOptions={{ color: '#00ffcc', weight: 2.5, opacity: 0.7 }}
          />
          {/* Distance label at midpoint */}
          <Marker position={seg.mid} icon={sideLabel(seg.distLabel)} interactive={false} />
          {/* LP number label */}
          {seg.lpLabel && (
            <Marker position={seg.perpMid} icon={lpLabel(seg.lpLabel)} interactive={false} />
          )}
        </Fragment>
      ))}

      {/* Corner markers */}
      {plotData.points.map((pt, idx) => (
        <Marker
          key={`corner-${idx}`}
          position={[pt.lat, pt.lon]}
          icon={cornerIcon(pt.sno, idx === targetPointIdx, verifiedPoints.has(idx))}
          eventHandlers={{ click: () => onSelectPoint(idx) }}
        >
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#1e293b' }}>
              <strong>Point {pt.sno}</strong><br />
              Lat: {pt.lat.toFixed(8)}<br />
              Lon: {pt.lon.toFixed(8)}<br />
              {pt.distance > 0 && <>Distance: {pt.distance}m<br /></>}
              {pt.sideLp && <>Side LP: {pt.sideLp}</>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* User position marker + accuracy circle */}
      {userPosition && (
        <>
          <Marker position={[userPosition.lat, userPosition.lon]} icon={userIcon} />
          <Circle
            center={[userPosition.lat, userPosition.lon]}
            radius={userPosition.accuracy || 3}
            pathOptions={{
              color: 'rgba(59, 130, 246, 0.4)',
              fillColor: 'rgba(59, 130, 246, 0.08)',
              fillOpacity: 0.3,
              weight: 1,
            }}
          />
          {/* Line from user to target */}
          <Polyline
            positions={[
              [userPosition.lat, userPosition.lon],
              [plotData.points[targetPointIdx].lat, plotData.points[targetPointIdx].lon],
            ]}
            pathOptions={{
              color: '#f87171',
              weight: 2,
              dashArray: '6, 6',
              opacity: 0.7,
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
