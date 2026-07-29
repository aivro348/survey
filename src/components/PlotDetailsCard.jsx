import { MapPin, Layers, Ruler, Hash } from 'lucide-react';
import { toDMS, metersToFeet, sqmToCents, sqmToHectares } from '../utils/geoUtils';

export default function PlotDetailsCard({
  plotData, calculatedCents, calculatedHectares, perimeterM,
  targetPointIdx, verifiedPoints, onSelectPoint,
}) {
  const { metadata, points } = plotData;
  const reportedCents = parseFloat(metadata.extent) || 0;
  const areaDiffPct = reportedCents > 0
    ? Math.abs(calculatedCents - reportedCents) / reportedCents * 100
    : 0;

  return (
    <>
      {/* Survey Metadata Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <Layers size={14} />
            Survey Details
          </div>
          <span style={{ fontSize: 10, color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
            SY-{metadata.surveyNo || '?'}
          </span>
        </div>
        <div className="card-body">
          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-label">District</span>
              <span className="meta-value">{metadata.district || '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Mandal</span>
              <span className="meta-value">{metadata.mandal || '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Village</span>
              <span className="meta-value">{metadata.village || '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Code</span>
              <span className="meta-value">{metadata.villageCode || '—'}</span>
            </div>
            <div className="meta-item full-width">
              <span className="meta-label">ULPIN</span>
              <span className="meta-value highlight">{metadata.ulpin || '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Datum</span>
              <span className="meta-value">{metadata.datum || 'WGS84'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Scale</span>
              <span className="meta-value">{metadata.scale || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Area Analytics Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <Ruler size={14} />
            Area Verification
          </div>
        </div>
        <div className="card-body">
          <div className="area-comparison">
            <div className="area-box">
              <div className="area-box-label">Reported</div>
              <div className="area-box-value">{reportedCents > 0 ? reportedCents.toFixed(2) : '—'}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cents</div>
            </div>
            <div className="area-vs">vs</div>
            <div className="area-box">
              <div className="area-box-label">Calculated</div>
              <div className="area-box-value">{calculatedCents.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cents</div>
            </div>
          </div>
          <div className={`area-match ${areaDiffPct < 5 ? 'good' : 'warning'}`} style={{ marginTop: 8 }}>
            {areaDiffPct < 5
              ? `✓ Area match: ${(100 - areaDiffPct).toFixed(1)}% agreement`
              : `⚠ Difference: ${areaDiffPct.toFixed(1)}%`
            }
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{calculatedHectares.toFixed(4)}</strong> Ha
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{perimeterM.toFixed(1)}</strong> m perimeter
            </div>
          </div>
        </div>
      </div>

      {/* Points Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <Hash size={14} />
            Corner Points ({points.length})
          </div>
          <span style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>
            {verifiedPoints.size}/{points.length} verified
          </span>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table className="points-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Dist(m)</th>
                <th>LP</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt, idx) => (
                <tr
                  key={idx}
                  className={`${idx === targetPointIdx ? 'active' : ''} ${verifiedPoints.has(idx) ? 'verified' : ''}`}
                  onClick={() => onSelectPoint(idx)}
                >
                  <td>
                    <span className={`point-badge ${verifiedPoints.has(idx) ? 'verified' : ''}`}>
                      {pt.sno}
                    </span>
                  </td>
                  <td>{pt.lat.toFixed(8)}</td>
                  <td>{pt.lon.toFixed(8)}</td>
                  <td>{pt.distance > 0 ? pt.distance.toFixed(2) : '—'}</td>
                  <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{pt.sideLp || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
