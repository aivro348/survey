import { useState } from 'react';
import { Plus, MapPin, Trash2, CheckCircle2, Calculator, Layers, AlertCircle, FileText, Printer } from 'lucide-react';
import { haversineDistance, shoelaceArea, sqmToCents, sqmToHectares, polygonPerimeter } from '../utils/geoUtils';
import FmbReportGenerator from './FmbReportGenerator';

export default function FieldSurveyCreator({
  userPosition, capturedPoints, setCapturedPoints,
  onCompleteSurvey, onResetSurvey, surveyMetadata, setSurveyMetadata,
  onStartGps, gpsActive,
}) {
  const [district, setDistrict] = useState(surveyMetadata.district || 'CHITTOOR');
  const [mandal, setMandal] = useState(surveyMetadata.mandal || 'SHANTIPURAM');
  const [village, setVillage] = useState(surveyMetadata.village || 'ARIMUTTHANAPALLE');
  const [surveyNo, setSurveyNo] = useState(surveyMetadata.surveyNo || '369');
  const [farmerName, setFarmerName] = useState(surveyMetadata.farmerName || 'Charan Kumar');
  const [showFmbReport, setShowFmbReport] = useState(false);

  const addPointAtUserLocation = () => {
    if (!userPosition) {
      if (onStartGps && !gpsActive) {
        onStartGps();
      }
      alert('Activating Live High-Precision GPS... Once your location updates, click "Capture GPS Corner Peg" again.');
      return;
    }

    const accuracy = userPosition.accuracy || 5;
    if (accuracy > 10) {
      if (!confirm(`⚠️ GPS Accuracy is currently ±${accuracy.toFixed(1)}m. For 99%+ land survey precision, please wait a moment for satellite lock to stabilize under open sky.\n\nDo you still want to record this point?`)) {
        return;
      }
    }

    const sno = capturedPoints.length + 1;
    let dist = 0;
    if (capturedPoints.length > 0) {
      const prev = capturedPoints[capturedPoints.length - 1];
      dist = haversineDistance(prev.lat, prev.lon, userPosition.lat, userPosition.lon);
    }

    const newPt = {
      sno,
      lat: userPosition.lat,
      lon: userPosition.lon,
      easting: Math.round(userPosition.lon * 10000) / 10,
      northing: Math.round(userPosition.lat * 10000) / 10,
      distance: Math.round(dist * 100) / 100,
      sideLp: `Side ${sno}`,
      accuracy: userPosition.accuracy || 2,
    };

    setCapturedPoints([...capturedPoints, newPt]);
  };

  const removePoint = (idx) => {
    const updated = capturedPoints.filter((_, i) => i !== idx).map((pt, i) => ({
      ...pt,
      sno: i + 1,
    }));
    setCapturedPoints(updated);
  };

  const handleFinish = () => {
    if (capturedPoints.length < 3) {
      alert('You need at least 3 corner points to close a land survey polygon and calculate area.');
      return;
    }

    const updatedMetadata = {
      ...surveyMetadata,
      farmerName,
      district,
      mandal,
      village,
      surveyNo,
      reportTitle: 'LIVE FIELD SURVEY REPORT',
    };

    setSurveyMetadata(updatedMetadata);
    onCompleteSurvey(updatedMetadata);
  };

  // Calculated area live metrics
  const areaSqm = capturedPoints.length >= 3 ? shoelaceArea(capturedPoints) : 0;
  const cents = sqmToCents(areaSqm);
  const hectares = sqmToHectares(areaSqm);
  const acres = (cents / 100).toFixed(2);
  const perimeter = capturedPoints.length >= 2 ? polygonPerimeter(capturedPoints) : 0;

  const currentSurveyPlotData = {
    metadata: {
      farmerName,
      district,
      mandal,
      village,
      villageCode: '1064031',
      surveyNo,
      ulpin: '74R0V0DBCYAGH0',
      extent: `${cents.toFixed(2)} Cents`,
      extentHectares: `${hectares.toFixed(4)} Hectares`,
      date: new Date().toLocaleString(),
      scale: '1:1000',
      datum: 'WGS 84',
      projection: 'UTM zone 44N',
    },
    points: capturedPoints,
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-title">
          <Layers size={14} />
          Field Survey Mapper
        </div>
        <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 600 }}>
          MODE: LIVE CREATOR
        </span>
      </div>

      <div className="card-body" style={{ display: 'flex', flexFlow: 'column', gap: 12 }}>
        {/* Farmer & Survey Info Inputs */}
        <div className="meta-grid">
          <div className="meta-item full-width">
            <span className="meta-label">Farmer / Owner Name</span>
            <input
              type="text"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              placeholder="e.g. Charan Kumar"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '5px 8px',
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div className="meta-item">
            <span className="meta-label">District</span>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div className="meta-item">
            <span className="meta-label">Mandal</span>
            <input
              type="text"
              value={mandal}
              onChange={(e) => setMandal(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div className="meta-item">
            <span className="meta-label">Village</span>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div className="meta-item">
            <span className="meta-label">Survey No</span>
            <input
              type="text"
              value={surveyNo}
              onChange={(e) => setSurveyNo(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Capture GPS Button */}
        <button
          className="btn btn-success"
          onClick={addPointAtUserLocation}
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
        >
          <MapPin size={16} />
          Capture GPS Corner Point #{capturedPoints.length + 1}
        </button>

        {/* Live Area Output Box */}
        {capturedPoints.length >= 3 ? (
          <div className="nav-metric-box" style={{ background: 'rgba(74, 222, 128, 0.08)', borderColor: 'rgba(74, 222, 128, 0.3)' }}>
            <div className="nav-metric-value" style={{ color: 'var(--accent-green)', fontSize: 20 }}>
              {cents.toFixed(2)} Cents ({acres} Acres)
            </div>
            <div className="nav-metric-unit">
              {hectares.toFixed(4)} Hectares | {areaSqm.toFixed(1)} m² | {perimeter.toFixed(1)}m perimeter
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
            Walk around the land boundary and capture at least 3 corner pegs to close the polygon.
          </div>
        )}

        {/* Captured Points Table */}
        {capturedPoints.length > 0 && (
          <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--border-glass)' }}>
            <table className="points-table">
              <thead>
                <tr>
                  <th>Pt</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Dist</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {capturedPoints.map((pt, idx) => (
                  <tr key={idx}>
                    <td><span className="point-badge">{pt.sno}</span></td>
                    <td>{pt.lat.toFixed(7)}</td>
                    <td>{pt.lon.toFixed(7)}</td>
                    <td>{pt.distance > 0 ? `${pt.distance.toFixed(1)}m` : '—'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() => removePoint(idx)}
                        title="Delete point"
                        style={{ padding: 3 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Finish & FMB Report Buttons */}
        <div style={{ display: 'flex', flexFlow: 'column', gap: 6, marginTop: 4 }}>
          {capturedPoints.length >= 3 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowFmbReport(true)}
              style={{ width: '100%', justifyContent: 'center', padding: 8 }}
            >
              <Printer size={14} /> Generate Official FMB Report PDF
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-success"
              onClick={handleFinish}
              disabled={capturedPoints.length < 3}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <CheckCircle2 size={14} /> Finish Survey
            </button>
            <button
              className="btn btn-danger"
              onClick={onResetSurvey}
              style={{ padding: '8px 12px' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* FMB Report Generator Modal */}
      {showFmbReport && (
        <FmbReportGenerator
          plotData={currentSurveyPlotData}
          onClose={() => setShowFmbReport(false)}
        />
      )}
    </div>
  );
}
