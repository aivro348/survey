/**
 * Geospatial Utility Functions for FMB Land Survey Navigator
 * Provides Haversine distance, bearing, relative directional guidance,
 * accuracy scoring, geodesic area, and coordinate formatting.
 */

const EARTH_RADIUS_M = 6371000; // Earth's mean radius in meters
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Haversine distance between two points in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Forward bearing from point 1 to point 2 in degrees (0–360)
 */
export function bearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δλ = (lon2 - lon1) * DEG2RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;
}

/**
 * Relative bearing: target bearing minus current heading, normalized to -180..+180
 *  Positive = turn right, Negative = turn left
 */
export function relativeBearing(currentHeading, targetBearing) {
  let diff = targetBearing - currentHeading;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Get micro-directional guidance label and icon from relative bearing
 */
export function getDirectionGuidance(relBearing, distanceMeters, targetBearing = 0) {
  const absBearing = Math.abs(relBearing);
  const distFt = metersToFeet(distanceMeters);
  const cardDir = compassLabel(targetBearing);

  let direction, icon, turnText;

  if (absBearing <= 20) {
    direction = 'FORWARD';
    icon = '⬆️';
    turnText = `Go Straight towards ${cardDir}`;
  } else if (absBearing >= 160) {
    direction = 'BACK';
    icon = '⬇️';
    turnText = `Turn Around towards ${cardDir}`;
  } else if (relBearing > 0 && relBearing <= 90) {
    direction = 'SLIGHT_RIGHT';
    icon = '↗️';
    turnText = `Turn ${Math.round(relBearing)}° Right (towards ${cardDir})`;
  } else if (relBearing > 90) {
    direction = 'SHARP_RIGHT';
    icon = '➡️';
    turnText = `Turn ${Math.round(relBearing)}° Right (towards ${cardDir})`;
  } else if (relBearing < 0 && relBearing >= -90) {
    direction = 'SLIGHT_LEFT';
    icon = '↖️';
    turnText = `Turn ${Math.round(Math.abs(relBearing))}° Left (towards ${cardDir})`;
  } else {
    direction = 'SHARP_LEFT';
    icon = '⬅️';
    turnText = `Turn ${Math.round(Math.abs(relBearing))}° Left (towards ${cardDir})`;
  }

  // Format human-readable distance
  let distText;
  if (distanceMeters < 0.5) {
    distText = `${(distanceMeters * 100).toFixed(0)} cm (${distFt.toFixed(1)} ft)`;
  } else if (distanceMeters < 10) {
    distText = `${distanceMeters.toFixed(1)} m (${distFt.toFixed(1)} ft)`;
  } else {
    distText = `${distanceMeters.toFixed(1)} m (${distFt.toFixed(0)} ft)`;
  }

  const fullInstruction = distanceMeters < 1.5
    ? `${icon} Almost There! ${distText} — Target Peg Reached!`
    : `${icon} ${turnText} — ${distText}`;

  return { direction, icon, instruction: fullInstruction, distText, cardDir };
}

/**
 * Accuracy percentage based on GPS position vs target distance
 * Uses a tolerance-based exponential decay: 100% at 0m, ~98% at 3m, ~90% at 15m
 */
export function accuracyPercentage(distanceMeters, gpsAccuracyMeters = 3) {
  if (distanceMeters <= 0) return 100;
  const effectiveError = Math.max(distanceMeters, gpsAccuracyMeters * 0.3);
  const accuracy = 100 * Math.exp(-0.007 * effectiveError);
  return Math.min(100, Math.max(0, accuracy));
}

/**
 * Shoelace formula for polygon area (in sq meters) from lat/lon points
 * Uses approximate planar projection (good for small plots)
 */
export function shoelaceArea(points) {
  const n = points.length;
  if (n < 3) return 0;

  // Convert to approximate meters using centroid as reference
  const centLat = points.reduce((s, p) => s + p.lat, 0) / n;
  const centLon = points.reduce((s, p) => s + p.lon, 0) / n;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(centLat * DEG2RAD);

  const coords = points.map(p => ({
    x: (p.lon - centLon) * mPerDegLon,
    y: (p.lat - centLat) * mPerDegLat,
  }));

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i].x * coords[j].y;
    area -= coords[j].x * coords[i].y;
  }
  return Math.abs(area) / 2;
}

/** Convert meters to feet */
export function metersToFeet(m) { return m * 3.28084; }

/** Convert square meters to hectares */
export function sqmToHectares(sqm) { return sqm / 10000; }

/** Convert square meters to cents (1 cent = 40.4686 sq m) */
export function sqmToCents(sqm) { return sqm / 40.4686; }

/** Format lat/lon to DMS string */
export function toDMS(decimal, isLat) {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(2);
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${d}°${m}'${s}"${dir}`;
}

/** Compass direction label from bearing degrees */
export function compassLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Calculate polygon perimeter from ordered lat/lon points (meters)
 */
export function polygonPerimeter(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    total += haversineDistance(points[i].lat, points[i].lon, next.lat, next.lon);
  }
  return total;
}

/**
 * Calculate centroid of polygon points
 */
export function polygonCentroid(points) {
  const n = points.length;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / n,
    lon: points.reduce((s, p) => s + p.lon, 0) / n,
  };
}
