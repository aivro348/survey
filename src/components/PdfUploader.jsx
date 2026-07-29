import { useState, useRef } from 'react';
import { Upload, FileText, MapPin } from 'lucide-react';

export default function PdfUploader({ onUpload, onLoadPreset, dataSource }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      onUpload(file);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      onUpload(file);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
    onLoadPreset();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-title">
          <Upload size={14} />
          Data Source
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          background: dataSource === 'preset' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(74, 222, 128, 0.12)',
          color: dataSource === 'preset' ? 'var(--accent-blue)' : 'var(--accent-green)',
        }}>
          {dataSource === 'preset' ? '📐 PRESET REPOR' : '📄 CUSTOM PDF'}
        </span>
      </div>
      <div className="card-body">
        {/* Quick preset button */}
        <button
          className="btn"
          onClick={onLoadPreset}
          style={{
            width: '100%',
            justify: 'center',
            marginBottom: 12,
            border: dataSource === 'preset' ? '1px solid var(--accent-blue)' : '1px solid var(--border-glass)',
            background: dataSource === 'preset' ? 'rgba(56, 189, 248, 0.08)' : 'transparent'
          }}
        >
          <MapPin size={14} />
          Use Demo Preset (Plot 368, Chittoor)
        </button>

        {/* Dropzone */}
        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''}`}
          style={{
            borderColor: dataSource === 'uploaded' ? 'var(--accent-green)' : undefined,
            background: dataSource === 'uploaded' ? 'rgba(74, 222, 128, 0.04)' : undefined,
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-icon">{dataSource === 'uploaded' ? '✅' : '📄'}</div>
          <div className="dropzone-text">
            <strong>{dataSource === 'uploaded' ? 'New PDF Loaded & Rendered!' : 'Upload New Survey PDF'}</strong><br />
            {dataSource === 'uploaded' ? 'Click or drop another file to switch' : 'Drag and drop or click to browse'}
          </div>
          {fileName && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <FileText size={12} /> {fileName}
              <button
                onClick={handleClear}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
                title="Reset to preset"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
