import { X, Globe, MapPin, FileSpreadsheet } from 'lucide-react';

export default function ExporterModal({ onClose, onExportGeoJSON, onExportKML, onExportCSV, surveyNo }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Export Survey Data</div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Survey No: {surveyNo || '—'} • Choose export format:
          </p>

          <button className="export-option" onClick={() => { onExportGeoJSON(); onClose(); }}>
            <div className="export-option-icon geojson">🌍</div>
            <div className="export-option-text">
              <div className="export-option-title">GeoJSON</div>
              <div className="export-option-desc">Open standard format for GIS tools (QGIS, Mapbox, etc.)</div>
            </div>
          </button>

          <button className="export-option" onClick={() => { onExportKML(); onClose(); }}>
            <div className="export-option-icon kml">📍</div>
            <div className="export-option-text">
              <div className="export-option-title">KML (Google Earth)</div>
              <div className="export-option-desc">View boundaries in Google Earth mobile & desktop</div>
            </div>
          </button>

          <button className="export-option" onClick={() => { onExportCSV(); onClose(); }}>
            <div className="export-option-icon csv">📊</div>
            <div className="export-option-text">
              <div className="export-option-title">CSV Spreadsheet</div>
              <div className="export-option-desc">All coordinates in comma-separated values for Excel/Sheets</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
