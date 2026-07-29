import { useRef } from 'react';
import { X, Printer, Download, ShieldCheck } from 'lucide-react';
import { shoelaceArea, sqmToCents, sqmToHectares, polygonPerimeter } from '../utils/geoUtils';

export default function FmbReportGenerator({ plotData, onClose }) {
  const printRef = useRef(null);
  const { metadata, points } = plotData;

  const areaSqm = shoelaceArea(points);
  const cents = sqmToCents(areaSqm);
  const hectares = sqmToHectares(areaSqm);
  const acres = (cents / 100).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        {/* Modal Top Bar */}
        <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-green)' }} />
            <div className="modal-title" style={{ fontSize: 14 }}>Official FMB Land Survey Report</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Print / Save PDF
            </button>
            <button className="btn btn-icon btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Official Printable Report Canvas */}
        <div ref={printRef} className="fmb-print-document" style={{ background: '#ffffff', color: '#000000', padding: '30px', fontFamily: 'sans-serif' }}>
          {/* Header */}
          <div style={{ border: '2px solid #000000', padding: '12px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div><strong>జిల్లా (District)</strong> : {metadata.district || 'CHITTOOR'}</div>
                <div><strong>మండలం (Mandal)</strong> : {metadata.mandal || 'SHANTIPURAM'}</div>
                <div><strong>గ్రామము కోడ్ (Village Code)</strong> : {metadata.villageCode || '1064031'}</div>
                <div><strong>గ్రామము పేరు (Village)</strong> : {metadata.village || 'ARIMUTTHANAPALLE'}</div>
                {metadata.farmerName && <div><strong>రైతు పేరు (Farmer Name)</strong> : {metadata.farmerName}</div>}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c00000' }}>
                  భూకమత పటము (FMB) : {metadata.surveyNo || '368'}
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <strong>విశిష్ట సంఖ్య (ULPIN) :</strong> {metadata.ulpin || '74R0V0DBCYAGH0'}
                </div>
              </div>

              <div style={{ fontSize: '13px', textAlign: 'right', lineHeight: '1.6' }}>
                <div><strong>విస్తీర్ణము (Area) :</strong> {acres} ఎ- సెంట్లు ({cents.toFixed(2)} Cents)</div>
                <div style={{ color: '#c00000', fontWeight: 'bold' }}>: {hectares.toFixed(4)} హె-ఎర్స్ (Ha)</div>
              </div>
            </div>
          </div>

          {/* Plot Diagram Canvas */}
          <div style={{ border: '1px solid #999', height: '320px', position: 'relative', marginBottom: '15px', background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* North Arrow */}
            <div style={{ position: 'absolute', top: '15px', right: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>▲</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>N</div>
            </div>

            {/* SVG Plot Polygon Diagram */}
            <SvgPlotCanvas points={points} width={650} height={280} />
          </div>

          {/* Datum & Projection Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
            <div>Datum: {metadata.datum || 'WGS 84'}</div>
            <div>Projection: {metadata.projection || 'UTM zone 44N'}</div>
          </div>

          {/* Coordinate Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', marginBottom: '15px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={thStyle}>SNo</th>
                <th style={thStyle}>Latitude</th>
                <th style={thStyle}>Longitude</th>
                <th style={thStyle}>Easting-X</th>
                <th style={thStyle}>Northing-Y</th>
                <th style={thStyle}>Distance (m)</th>
                <th style={thStyle}>Side LPNo</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{pt.sno}</td>
                  <td style={tdStyle}>{pt.lat.toFixed(6)}</td>
                  <td style={tdStyle}>{pt.lon.toFixed(6)}</td>
                  <td style={tdStyle}>{pt.easting ? pt.easting.toFixed(1) : (pt.lon * 10000).toFixed(1)}</td>
                  <td style={tdStyle}>{pt.northing ? pt.northing.toFixed(1) : (pt.lat * 10000).toFixed(1)}</td>
                  <td style={tdStyle}>{pt.distance > 0 ? pt.distance.toFixed(2) : '—'}</td>
                  <td style={tdStyle}>{pt.sideLp || `Side ${pt.sno}`}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
            <div>తేదీ (Date): {metadata.date || new Date().toLocaleString()}</div>
            <div>Scale {metadata.scale || '1:1000'}</div>
            <div>కొలతలు అన్నీ మీటరులో ఉన్నాయి (All measurements in meters)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = { border: '1px solid #333', padding: '6px', fontWeight: 'bold' };
const tdStyle = { border: '1px solid #ccc', padding: '5px' };

/**
 * SVG renderer for FMB Plot Diagram in printable report
 */
function SvgPlotCanvas({ points, width, height }) {
  if (!points || points.length < 3) return null;

  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLon = Math.min(...points.map(p => p.lon));
  const maxLon = Math.max(...points.map(p => p.lon));

  const pad = 40;
  const mapWidth = width - pad * 2;
  const mapHeight = height - pad * 2;

  const dLat = maxLat - minLat || 0.0001;
  const dLon = maxLon - minLon || 0.0001;

  const svgPoints = points.map(p => {
    const x = pad + ((p.lon - minLon) / dLon) * mapWidth;
    const y = height - (pad + ((p.lat - minLat) / dLat) * mapHeight); // Invert Y
    return { ...p, x, y };
  });

  const polygonPath = svgPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Polygon */}
      <polygon points={polygonPath} fill="#e6f7ff" stroke="#000000" strokeWidth="2" />

      {/* Points & Numbers */}
      {svgPoints.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="4" fill="#c00000" />
          <text x={pt.x + 8} y={pt.y + 4} fontSize="12" fontWeight="bold" fill="#c00000">
            {pt.sno}
          </text>
        </g>
      ))}

      {/* Side Lengths */}
      {svgPoints.map((pt, i) => {
        const next = svgPoints[(i + 1) % svgPoints.length];
        const midX = (pt.x + next.x) / 2;
        const midY = (pt.y + next.y) / 2;
        return (
          <text key={`dist-${i}`} x={midX} y={midY - 4} fontSize="10" textAnchor="middle" fill="#000000">
            {pt.distance > 0 ? `${pt.distance}m` : ''}
          </text>
        );
      })}
    </svg>
  );
}
