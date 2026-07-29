import { useState, useCallback, useEffect, useRef } from 'react';
import { REFERENCE_PLOT_DATA, parseFMBPdf, toGeoJSON, toKML, toCSV } from './utils/pdfParser';
import {
  haversineDistance, bearing, relativeBearing, getDirectionGuidance,
  accuracyPercentage, shoelaceArea, metersToFeet, sqmToHectares,
  sqmToCents, polygonPerimeter, polygonCentroid, toDMS,
} from './utils/geoUtils';
import { playBeep, playSuccessChime, getBeepInterval, getBeepFrequency, vibrateDevice, resumeAudioContext } from './utils/audioRadar';
import { speak, speakNavigation, speakPointSelected, speakVerified, toggleSpeech, isSpeechEnabled } from './utils/speechSynth';
import MapView from './components/MapView';
import PlotDetailsCard from './components/PlotDetailsCard';
import GpsNavigatorCard from './components/GpsNavigatorCard';
import PdfUploader from './components/PdfUploader';
import FieldSurveyCreator from './components/FieldSurveyCreator';
import ExporterModal from './components/ExporterModal';
import {
  MapPin, Upload, Download, Navigation, Satellite, Volume2, VolumeX,
  Menu, X, Crosshair, Locate, Compass, FileText, PlusCircle
} from 'lucide-react';

export default function App() {
  // Mode State: 'inspect' (PDF Ground-Truthing) vs 'create' (Live Field Surveyor)
  const [appMode, setAppMode] = useState('inspect');

  // Data State
  const [plotData, setPlotData] = useState(REFERENCE_PLOT_DATA);
  const [dataSource, setDataSource] = useState('preset'); // 'preset' | 'uploaded' | 'live_created'
  const [capturedPoints, setCapturedPoints] = useState([]);
  const [surveyMetadata, setSurveyMetadata] = useState({
    district: 'CHITTOOR',
    mandal: 'SHANTIPURAM',
    village: 'ARIMUTTHANAPALLE',
    surveyNo: '369',
  });

  // Navigation State
  const [targetPointIdx, setTargetPointIdx] = useState(0); // Index into plotData.points
  const [userPosition, setUserPosition] = useState(null); // { lat, lon, accuracy, heading }
  const [gpsActive, setGpsActive] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState(false);
  const [verifiedPoints, setVerifiedPoints] = useState(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exporterOpen, setExporterOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState('satellite');
  const [showCadGrid, setShowCadGrid] = useState(true);
  const [showNodes, setShowNodes] = useState(true);

  // GPS Watch Ref
  const watchIdRef = useRef(null);
  const beepIntervalRef = useRef(null);
  const simPositionRef = useRef(null);

  // Active Points dataset depends on Mode
  const activePoints = appMode === 'create' && capturedPoints.length > 0
    ? capturedPoints
    : plotData.points;

  // Computed values
  const targetPoint = activePoints[targetPointIdx] || activePoints[0];
  const centroid = polygonCentroid(activePoints.length > 0 ? activePoints : plotData.points);
  const calculatedAreaSqm = shoelaceArea(activePoints);
  const calculatedCents = sqmToCents(calculatedAreaSqm);
  const calculatedHectares = sqmToHectares(calculatedAreaSqm);
  const perimeterM = polygonPerimeter(activePoints);

  // Distance & bearing to target
  const distanceToTarget = userPosition && targetPoint
    ? haversineDistance(userPosition.lat, userPosition.lon, targetPoint.lat, targetPoint.lon)
    : null;

  const bearingToTarget = userPosition && targetPoint
    ? bearing(userPosition.lat, userPosition.lon, targetPoint.lat, targetPoint.lon)
    : null;

  const userHeading = userPosition?.heading ?? 0;

  const relBearing = bearingToTarget !== null
    ? relativeBearing(userHeading, bearingToTarget)
    : 0;

  const directionGuidance = distanceToTarget !== null
    ? getDirectionGuidance(relBearing, distanceToTarget, bearingToTarget || 0)
    : null;

  const accuracyPct = distanceToTarget !== null
    ? accuracyPercentage(distanceToTarget, userPosition?.accuracy ?? 5)
    : null;

  // === GPS TRACKING ===
  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      alert('GPS / Geolocation not supported on this device.');
      return;
    }
    resumeAudioContext();
    setGpsActive(true);
    setSimulatorMode(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? 0,
        });
      },
      (err) => {
        console.error('GPS Error:', err);
        if (err.code === 1) alert('Location permission denied. Please enable GPS access.');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }, []);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
    setUserPosition(null);
    clearBeepInterval();
  }, []);

  // === SIMULATOR ===
  const startSimulator = useCallback(() => {
    resumeAudioContext();
    setSimulatorMode(true);
    setGpsActive(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    const c = polygonCentroid(activePoints.length > 0 ? activePoints : plotData.points);
    const fallbackLoc = { lat: c.lat - 0.0001, lon: c.lon - 0.0001, accuracy: 2, heading: 45 };

    // Try to get real GPS location first to initialize simulation at real-world coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const realLoc = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 2,
            heading: pos.coords.heading ?? 0
          };
          simPositionRef.current = { lat: realLoc.lat, lon: realLoc.lon };
          setUserPosition(realLoc);
        },
        () => {
          // Fallback to plot centroid if real location fails
          simPositionRef.current = { lat: fallbackLoc.lat, lon: fallbackLoc.lon };
          setUserPosition(fallbackLoc);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      simPositionRef.current = { lat: fallbackLoc.lat, lon: fallbackLoc.lon };
      setUserPosition(fallbackLoc);
    }
  }, [activePoints, plotData.points]);

  const stopSimulator = useCallback(() => {
    setSimulatorMode(false);
    setUserPosition(null);
    clearBeepInterval();
  }, []);

  const moveSimulator = useCallback((dlat, dlon) => {
    if (!simPositionRef.current) return;
    const newLat = simPositionRef.current.lat + dlat;
    const newLon = simPositionRef.current.lon + dlon;
    const heading = bearing(simPositionRef.current.lat, simPositionRef.current.lon, newLat, newLon);
    simPositionRef.current = { lat: newLat, lon: newLon };
    setUserPosition({ lat: newLat, lon: newLon, accuracy: 2, heading });
  }, []);

  const teleportToNearTarget = useCallback((ptIdx) => {
    const pts = activePoints.length > 0 ? activePoints : plotData.points;
    const pt = pts[ptIdx];
    if (!pt) return;
    const offsetLat = (Math.random() - 0.5) * 0.0003;
    const offsetLon = (Math.random() - 0.5) * 0.0003;
    const newPos = { lat: pt.lat + offsetLat, lon: pt.lon + offsetLon };
    simPositionRef.current = newPos;
    setUserPosition({ ...newPos, accuracy: 2, heading: bearing(newPos.lat, newPos.lon, pt.lat, pt.lon) });
  }, [activePoints, plotData.points]);

  const stepTowardsTarget = useCallback(() => {
    if (!simPositionRef.current || !targetPoint) return;
    const curr = simPositionRef.current;
    const dist = haversineDistance(curr.lat, curr.lon, targetPoint.lat, targetPoint.lon);
    const stepSize = Math.min(dist, 1);
    const b = bearing(curr.lat, curr.lon, targetPoint.lat, targetPoint.lon);
    const dLat = (stepSize / 111320) * Math.cos(b * Math.PI / 180);
    const dLon = (stepSize / (111320 * Math.cos(curr.lat * Math.PI / 180))) * Math.sin(b * Math.PI / 180);
    const newPos = { lat: curr.lat + dLat, lon: curr.lon + dLon };
    simPositionRef.current = newPos;
    setUserPosition({ ...newPos, accuracy: 2, heading: b });
  }, [targetPoint]);

  // === AUDIO RADAR ===
  function clearBeepInterval() {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }

  useEffect(() => {
    clearBeepInterval();
    if (!audioEnabled || distanceToTarget === null) return;

    const interval = getBeepInterval(distanceToTarget);
    if (interval === null) return;

    const freq = getBeepFrequency(distanceToTarget);
    beepIntervalRef.current = setInterval(() => {
      playBeep(freq, 0.06, 0.25);
    }, interval);

    return clearBeepInterval;
  }, [distanceToTarget, audioEnabled]);

  // === GROUND VERIFICATION ===
  useEffect(() => {
    if (distanceToTarget !== null && distanceToTarget < 1.5 && !verifiedPoints.has(targetPointIdx) && targetPoint) {
      setVerifiedPoints(prev => new Set([...prev, targetPointIdx]));
      playSuccessChime();
      vibrateDevice([200, 100, 200]);
      if (voiceEnabled) speakVerified(targetPoint.sno);
    }
  }, [distanceToTarget, targetPointIdx, verifiedPoints, voiceEnabled, targetPoint]);

  // === VOICE GUIDANCE ===
  useEffect(() => {
    if (voiceEnabled && directionGuidance && distanceToTarget !== null) {
      speakNavigation(distanceToTarget, directionGuidance.instruction);
    }
  }, [
    voiceEnabled,
    directionGuidance?.direction,
    distanceToTarget !== null && distanceToTarget < 3,
  ]);

  const selectTargetPoint = useCallback((idx) => {
    setTargetPointIdx(idx);
    if (voiceEnabled && activePoints[idx]) speakPointSelected(activePoints[idx].sno);
  }, [voiceEnabled, activePoints]);

  // === PDF UPLOAD ===
  const handlePdfUpload = useCallback(async (file) => {
    const parsed = await parseFMBPdf(file);
    if (parsed && parsed.points.length > 0) {
      setPlotData(parsed);
      setDataSource('uploaded');
      setTargetPointIdx(0);
      setVerifiedPoints(new Set());
      setAppMode('inspect');
    } else {
      alert(`⚠️ Could not extract digital coordinates from "${file.name}".\n\nPossible Reason: This PDF appears to be a scanned image or drawing without embedded text tables.\n\nTip: You can use "Live Field Mapper" mode to manually place nodes on the satellite map or upload a digital FMB report PDF.`);
    }
  }, []);

  const loadPreset = useCallback(() => {
    setPlotData(REFERENCE_PLOT_DATA);
    setDataSource('preset');
    setTargetPointIdx(0);
    setVerifiedPoints(new Set());
    setAppMode('inspect');
  }, []);

  // === MODE B: FIELD MAPPER COMPLETE ===
  const handleCompleteFieldSurvey = (meta) => {
    if (capturedPoints.length < 3) return;
    const newPlotData = {
      metadata: {
        ...meta,
        extent: `${sqmToCents(shoelaceArea(capturedPoints)).toFixed(2)} Cents`,
        extentHectares: `${sqmToHectares(shoelaceArea(capturedPoints)).toFixed(4)} Hectares`,
        datum: 'WGS 84',
        projection: 'UTM zone 44N',
      },
      points: capturedPoints,
    };
    setPlotData(newPlotData);
    setDataSource('live_created');
    setTargetPointIdx(0);
    setAppMode('inspect');
  };

  const handleResetFieldSurvey = () => {
    setCapturedPoints([]);
  };

  // === EXPORTS ===
  const currentPlotDataForExport = appMode === 'create' && capturedPoints.length >= 3
    ? {
        metadata: {
          ...surveyMetadata,
          reportTitle: 'LIVE FIELD SURVEY REPORT',
          extent: `${sqmToCents(shoelaceArea(capturedPoints)).toFixed(2)} Cents`,
        },
        points: capturedPoints,
      }
    : plotData;

  const exportGeoJSON = () => {
    const data = JSON.stringify(toGeoJSON(currentPlotDataForExport), null, 2);
    downloadFile(data, `FMB_${currentPlotDataForExport.metadata.surveyNo || 'plot'}.geojson`, 'application/json');
  };

  const exportKML = () => {
    const data = toKML(currentPlotDataForExport);
    downloadFile(data, `FMB_${currentPlotDataForExport.metadata.surveyNo || 'plot'}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const exportCSV = () => {
    const data = toCSV(currentPlotDataForExport);
    downloadFile(data, `FMB_${currentPlotDataForExport.metadata.surveyNo || 'plot'}.csv`, 'text/csv');
  };

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const toggleVoice = () => {
    const enabled = toggleSpeech();
    setVoiceEnabled(enabled);
  };

  // Map click handler for Live Field Mapper mode
  const handleMapClick = useCallback((lat, lon) => {
    if (appMode === 'create') {
      const sno = capturedPoints.length + 1;
      let dist = 0;
      if (capturedPoints.length > 0) {
        const prev = capturedPoints[capturedPoints.length - 1];
        dist = haversineDistance(prev.lat, prev.lon, lat, lon);
      }
      const newPt = {
        sno,
        lat,
        lon,
        easting: Math.round(lon * 10000) / 10,
        northing: Math.round(lat * 10000) / 10,
        distance: Math.round(dist * 100) / 100,
        sideLp: `Side ${sno}`,
      };
      setCapturedPoints(prev => [...prev, newPt]);
    }
  }, [appMode, capturedPoints]);

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-brand">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }} id="menu-toggle">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="navbar-logo" style={{ background: 'var(--gradient-success)' }}>🏛️</div>
          <div>
            <div className="navbar-title" style={{ fontSize: 17, letterSpacing: '-0.2px' }}>Charan Land Survey & Field Navigator</div>
            <div className="navbar-subtitle">High-Precision GPS Ground Truthing & Field Surveyor</div>
          </div>
        </div>

        {/* WORKFLOW MODE SWITCHER */}
        <div className="btn-group" style={{ background: 'rgba(15, 23, 42, 0.8)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <button
            className={`btn btn-sm ${appMode === 'inspect' ? 'btn-primary' : ''}`}
            onClick={() => setAppMode('inspect')}
          >
            <FileText size={13} /> PDF Ground-Truth
          </button>
          <button
            className={`btn btn-sm ${appMode === 'create' ? 'btn-primary' : ''}`}
            onClick={() => setAppMode('create')}
            style={appMode === 'create' ? { background: 'var(--gradient-success)', color: '#0a0e1a' } : {}}
          >
            <PlusCircle size={13} /> Live Field Mapper
          </button>
        </div>

        <div className="navbar-actions">
          <button className="btn btn-sm" onClick={() => setAudioEnabled(!audioEnabled)} title={audioEnabled ? 'Mute radar' : 'Enable radar'}>
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button className="btn btn-sm" onClick={toggleVoice} title={voiceEnabled ? 'Disable voice' : 'Enable voice'}>
            {voiceEnabled ? '🔊' : '🔇'}
            <span style={{ fontSize: 10 }}>Voice</span>
          </button>
          <button className="btn btn-sm" onClick={loadPreset}>
            <MapPin size={14} />
            Preset
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setExporterOpen(true)}>
            <Download size={14} />
            Export
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-scroll">
            {appMode === 'inspect' ? (
              <>
                {/* PDF Uploader */}
                <PdfUploader onUpload={handlePdfUpload} onLoadPreset={loadPreset} dataSource={dataSource} />

                {/* Plot Details */}
                <PlotDetailsCard
                  plotData={plotData}
                  calculatedCents={calculatedCents}
                  calculatedHectares={calculatedHectares}
                  perimeterM={perimeterM}
                  targetPointIdx={targetPointIdx}
                  verifiedPoints={verifiedPoints}
                  onSelectPoint={selectTargetPoint}
                />
              </>
            ) : (
              /* Live Field Mapper Creator */
              <FieldSurveyCreator
                userPosition={userPosition}
                capturedPoints={capturedPoints}
                setCapturedPoints={setCapturedPoints}
                onCompleteSurvey={handleCompleteFieldSurvey}
                onResetSurvey={handleResetFieldSurvey}
                surveyMetadata={surveyMetadata}
                setSurveyMetadata={setSurveyMetadata}
                onStartGps={startGps}
                gpsActive={gpsActive}
              />
            )}
          </div>
        </aside>

        {/* MAP */}
        <div className="map-wrapper">
          <MapView
            plotData={appMode === 'create' && capturedPoints.length > 0 ? { metadata: surveyMetadata, points: capturedPoints } : plotData}
            targetPointIdx={targetPointIdx}
            userPosition={userPosition}
            verifiedPoints={verifiedPoints}
            mapLayer={mapLayer}
            centroid={centroid}
            onSelectPoint={selectTargetPoint}
            onMapClick={handleMapClick}
            showCadGrid={showCadGrid}
            showNodes={showNodes}
          />

          {/* Layer Switcher & Feature Overlay Controls */}
          <div className="map-overlay top-left">
            <div className="layer-switcher">
              <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🛰️ Esri Latest HD Satellite (30cm)
              </div>
              <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
              <button className={`layer-btn ${showCadGrid ? 'active' : ''}`} onClick={() => setShowCadGrid(!showCadGrid)}>
                📐 CAD Grid
              </button>
              <button className={`layer-btn ${showNodes ? 'active' : ''}`} onClick={() => setShowNodes(!showNodes)}>
                📍 Nodes
              </button>
            </div>
          </div>

          {/* GPS Navigator Overlay */}
          <div className="map-overlay top-right">
            <GpsNavigatorCard
              targetPoint={targetPoint}
              targetPointIdx={targetPointIdx}
              userPosition={userPosition}
              distanceToTarget={distanceToTarget}
              bearingToTarget={bearingToTarget}
              relBearing={relBearing}
              directionGuidance={directionGuidance}
              accuracyPct={accuracyPct}
              gpsActive={gpsActive}
              simulatorMode={simulatorMode}
              verifiedPoints={verifiedPoints}
              onStartGps={startGps}
              onStopGps={stopGps}
              onStartSimulator={startSimulator}
              onStopSimulator={stopSimulator}
              onMoveSimulator={moveSimulator}
              onStepTowardsTarget={stepTowardsTarget}
              onTeleportNear={teleportToNearTarget}
              totalPoints={activePoints.length}
              plotPoints={activePoints}
              onSelectPoint={selectTargetPoint}
            />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {exporterOpen && (
        <ExporterModal
          onClose={() => setExporterOpen(false)}
          onExportGeoJSON={exportGeoJSON}
          onExportKML={exportKML}
          onExportCSV={exportCSV}
          surveyNo={currentPlotDataForExport.metadata.surveyNo}
        />
      )}
    </div>
  );
}
