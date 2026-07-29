import { useState } from 'react';
import {
  Navigation, Crosshair, Locate, Play, Square, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Footprints, Zap, ZapOff, Target
} from 'lucide-react';
import { metersToFeet, toDMS } from '../utils/geoUtils';

export default function GpsNavigatorCard({
  targetPoint, targetPointIdx, userPosition, distanceToTarget,
  bearingToTarget, relBearing, directionGuidance, accuracyPct,
  gpsActive, simulatorMode, verifiedPoints,
  onStartGps, onStopGps, onStartSimulator, onStopSimulator,
  onMoveSimulator, onStepTowardsTarget, onTeleportNear,
  totalPoints, plotPoints,
}) {
  const [simStepSize, setSimStepSize] = useState(0.00001); // ~1.1m
  const isActive = gpsActive || simulatorMode;
  const isVerified = verifiedPoints.has(targetPointIdx);

  const getAccuracyClass = () => {
    if (accuracyPct === null) return '';
    if (accuracyPct >= 90) return '';
    if (accuracyPct >= 70) return 'low';
    return 'very-low';
  };

  // Get arrow rotation from relative bearing
  const arrowRotation = relBearing || 0;

  return (
    <div className="nav-card">
      {/* Header */}
      <div className="nav-card-header">
        <div className="nav-status">
          <div className={`nav-status-dot ${simulatorMode ? 'simulating' : gpsActive ? 'active' : 'inactive'}`} />
          <span style={{ color: simulatorMode ? 'var(--accent-amber)' : gpsActive ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {simulatorMode ? 'SIMULATOR' : gpsActive ? 'GPS ACTIVE' : 'GPS OFF'}
          </span>
        </div>
        <div className="btn-group">
          {!isActive ? (
            <>
              <button className="btn btn-sm btn-success" onClick={onStartGps}>
                <Locate size={12} /> Live GPS
              </button>
              <button className="btn btn-sm" onClick={onStartSimulator} style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
                <Crosshair size={12} /> Simulate
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-danger" onClick={simulatorMode ? onStopSimulator : onStopGps}>
              <Square size={12} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Target Point Info & Stepper */}
      <div className="nav-target-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="nav-target-label">Navigating to Corner</div>
          <div className="btn-group">
            <button
              className="btn btn-sm"
              onClick={() => onSelectPoint((targetPointIdx - 1 + totalPoints) % totalPoints)}
              title="Previous Point"
              style={{ padding: '2px 8px', fontSize: 10 }}
            >
              ◀ Pt {((targetPointIdx - 1 + totalPoints) % totalPoints) + 1}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onSelectPoint((targetPointIdx + 1) % totalPoints)}
              title="Next Point"
              style={{ padding: '2px 8px', fontSize: 10 }}
            >
              Pt {((targetPointIdx + 1) % totalPoints) + 1} ▶
            </button>
          </div>
        </div>

        <div className="nav-target-point">
          <div className="nav-target-num">{targetPoint?.sno ?? '?'}</div>
          <div className="nav-target-coords">
            <span>Lat: {targetPoint?.lat?.toFixed(8) ?? '—'}</span>
            <span>Lon: {targetPoint?.lon?.toFixed(8) ?? '—'}</span>
            {targetPoint?.sideLp && (
              <span style={{ color: 'var(--accent-purple)', fontWeight: 600, fontSize: 10 }}>
                Side LP: {targetPoint.sideLp}
              </span>
            )}
          </div>
          {isVerified && (
            <span className="verified-badge">✓ VERIFIED</span>
          )}
        </div>

        {/* Suggest Next Point Banner when Verified */}
        {isVerified && totalPoints > 1 && (
          <button
            className="btn btn-success"
            onClick={() => onSelectPoint((targetPointIdx + 1) % totalPoints)}
            style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: 6, marginTop: 4 }}
          >
            ➔ Next Corner Peg (Point {((targetPointIdx + 1) % totalPoints) + 1})
          </button>
        )}

        {/* Distance & Accuracy Metrics */}
        {isActive && distanceToTarget !== null && (
          <>
            <div className="nav-metrics">
              <div className="nav-metric-box">
                <div className="nav-metric-value distance">
                  {distanceToTarget < 1 ? distanceToTarget.toFixed(2) : distanceToTarget.toFixed(1)}
                </div>
                <div className="nav-metric-unit">
                  meters ({metersToFeet(distanceToTarget).toFixed(1)} ft)
                </div>
              </div>
              <div className="nav-metric-box">
                <div className={`nav-metric-value accuracy ${getAccuracyClass()}`}>
                  {accuracyPct?.toFixed(1) ?? '—'}%
                </div>
                <div className="nav-metric-unit">
                  accuracy {userPosition?.accuracy ? `(±${userPosition.accuracy.toFixed(1)}m)` : ''}
                </div>
              </div>
            </div>
            <div className="accuracy-gauge">
              <div
                className={`accuracy-gauge-fill ${accuracyPct >= 90 ? 'high' : accuracyPct >= 70 ? 'medium' : 'low'}`}
                style={{ width: `${Math.min(100, accuracyPct || 0)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Direction HUD */}
      {isActive && directionGuidance && (
        <div className="direction-hud">
          <div
            className={`direction-arrow ${distanceToTarget < 1.5 ? 'reached' : ''}`}
            style={{
              transform: `rotate(${arrowRotation}deg)`,
            }}
          >
            {distanceToTarget < 1.5 ? '✅' : '🔺'}
          </div>
          <div className="direction-text">
            {directionGuidance.instruction}
          </div>
          {bearingToTarget !== null && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              Bearing: {bearingToTarget.toFixed(1)}° | Heading: {(userPosition?.heading ?? 0).toFixed(1)}°
            </div>
          )}
        </div>
      )}

      {/* Simulator Controls */}
      {simulatorMode && (
        <div className="simulator-controls">
          <div className="simulator-label">
            <Crosshair size={12} /> Field Simulator Controls
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center' }}>
            {/* Joystick Grid */}
            <div className="simulator-joystick">
              <div />
              <button className="sim-btn" onClick={() => onMoveSimulator(simStepSize, 0)} title="Move North">
                <ChevronUp size={16} />
              </button>
              <div />
              <button className="sim-btn" onClick={() => onMoveSimulator(0, -simStepSize)} title="Move West">
                <ChevronLeft size={16} />
              </button>
              <button className="sim-btn center" onClick={onStepTowardsTarget} title="Step towards target">
                <Target size={14} />
              </button>
              <button className="sim-btn" onClick={() => onMoveSimulator(0, simStepSize)} title="Move East">
                <ChevronRight size={16} />
              </button>
              <div />
              <button className="sim-btn" onClick={() => onMoveSimulator(-simStepSize, 0)} title="Move South">
                <ChevronDown size={16} />
              </button>
              <div />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="sim-speed">
                <label>Step:</label>
                <input
                  type="range"
                  min={0.000002}
                  max={0.0001}
                  step={0.000002}
                  value={simStepSize}
                  onChange={(e) => setSimStepSize(parseFloat(e.target.value))}
                />
                <span style={{ fontSize: 9, color: 'var(--accent-amber)', fontFamily: 'JetBrains Mono', width: 40 }}>
                  {(simStepSize * 111320).toFixed(1)}m
                </span>
              </div>
              <button className="btn btn-sm" onClick={onStepTowardsTarget} style={{ fontSize: 10 }}>
                <Footprints size={12} /> Step → Target
              </button>
            </div>
          </div>

          {/* Quick teleport to near each point */}
          <div className="sim-auto-nav">
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginRight: 4 }}>Jump near:</span>
            {plotPoints.map((_, i) => (
              <button key={i} className="sim-auto-btn" onClick={() => onTeleportNear(i)}>
                Pt {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Position Footer */}
      {isActive && userPosition && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border-glass)',
          fontSize: 10,
          fontFamily: 'JetBrains Mono',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>You: {userPosition.lat.toFixed(7)}, {userPosition.lon.toFixed(7)}</span>
          <span>±{(userPosition.accuracy || 0).toFixed(1)}m</span>
        </div>
      )}
    </div>
  );
}
