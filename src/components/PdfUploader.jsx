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
          {dataSource === 'preset' ? '📐 PRESET' : '📄 UPLOADED'}
        </span>
      </div>
      <div className="card-body">
        {/* Quick preset toggle */}
        <button
          className="btn"
          onClick={onLoadPreset}
          style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
        >
          <MapPin size={14} />
          Load SinglePlotRepor.pdf (Plot 368, Chittoor)
        </button>

        {/* Dropzone */}
        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-icon">📄</div>
          <div className="dropzone-text">
            <strong>Drop FMB PDF here</strong><br />
            or click to browse
          </div>
          {fileName && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <FileText size={12} /> {fileName}
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
