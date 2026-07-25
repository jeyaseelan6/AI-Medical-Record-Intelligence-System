import React, { useState, useRef } from 'react';
import { api } from '../context/AuthContext.jsx';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

const FileUpload = ({ patientId, onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setError('');
    setSuccess(false);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);

    try {
      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[Upload Error]', err.message);
      setError(err.response?.data?.message || 'Failed to process and analyze the file. Ensure it is a valid PDF or Image.');
    } finally {
      setLoading(false);
    }
  };

  const triggerInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div style={{ position: 'relative' }}>
      <form 
        onDragEnter={handleDrag} 
        onDragOver={handleDrag} 
        onDragLeave={handleDrag} 
        onDrop={handleDrop}
        onSubmit={(e) => e.preventDefault()}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          style={{ display: 'none' }} 
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleChange}
          disabled={loading}
        />
        
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onClick={triggerInput}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="spinner-primary"></div>
              <span className="upload-text" style={{ color: 'var(--color-primary)' }}>Analyzing Record via Vision AI...</span>
              <span className="upload-hint">Running OCR, extracting medications, and checking vitals (usually takes 4-8s)</span>
            </div>
          ) : success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              <span className="upload-text" style={{ color: 'var(--color-success)' }}>Record Processed Successfully!</span>
              <span className="upload-hint">Chronological charts & insights have been compiled.</span>
            </div>
          ) : (
            <>
              <UploadCloud size={40} className="upload-icon" />
              <span className="upload-text">Drag and drop file here or click to browse</span>
              <span className="upload-hint">Supports PDF, PNG, JPEG formats up to 10MB</span>
            </>
          )}
        </div>
      </form>

      {error && (
        <div 
          className="insight-alert-item duplicate_medication" 
          style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <AlertTriangle size={18} />
          <div>
            <div className="insight-desc">Parsing Error</div>
            <div className="insight-evidence">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
