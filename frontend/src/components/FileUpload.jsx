import React, { useState, useRef } from 'react';
import { api } from '../context/AuthContext.jsx';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

const FileUpload = ({ patientId, onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [unrelatedWarning, setUnrelatedWarning] = useState(false);
  
  const [loadingStep, setLoadingStep] = useState(0);
  
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

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
    setUnrelatedWarning(false);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.isUnrelated) {
        setUnrelatedWarning(true);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        // Keep warning visible for 8 seconds
        setTimeout(() => setUnrelatedWarning(false), 8000);
      } else {
        setSuccess(true);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        setTimeout(() => setSuccess(false), 3000);
      }
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
          className={`upload-zone ${dragActive ? 'drag-active' : ''} ${loading ? 'scanner-container' : ''}`}
          onClick={triggerInput}
          style={{ cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0', width: '100%' }}>
              <div className="scanner-laser"></div>
              
              {/* Stylized Document Scanner View */}
              <div style={{ 
                position: 'relative', 
                width: '70px', 
                height: '85px', 
                border: '2px dashed var(--color-primary-light)', 
                borderRadius: '6px', 
                background: 'rgba(13, 148, 136, 0.04)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <UploadCloud size={28} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '24px' }}>
                <div className="pulsing-dot"></div>
                <span className="upload-text" style={{ color: 'var(--color-primary)', fontSize: '15px', fontWeight: '500' }}>
                  {loadingStep === 0 && "OCR Extraction: Scanning medical record layout..."}
                  {loadingStep === 1 && "Vision Parsing: Extracting medications & clinical entities..."}
                  {loadingStep === 2 && "Safety Scan: Running longitudinal duplication checks..."}
                  {loadingStep === 3 && "Chart Integration: Plotting vitals and updating metrics..."}
                </span>
              </div>
              <span className="upload-hint">Performing clinical intelligence checks (usually takes 4-8s)</span>
            </div>
          ) : success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              <span className="upload-text" style={{ color: 'var(--color-success)' }}>Record Processed Successfully!</span>
              <span className="upload-hint">Chronological charts & insights have been compiled.</span>
            </div>
          ) : unrelatedWarning ? (
            <div className="alert-box alert-warning" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', width: '100%' }}>
              <AlertTriangle size={32} />
              <span style={{ fontSize: '15px', fontWeight: 600 }}>Unrelated Document Detected!</span>
              <span style={{ fontSize: '12.5px', textAlign: 'center', maxWidth: '380px', opacity: 0.9 }}>
                This file is not a medical or clinical record. It has been saved but excluded from active timeline charts.
              </span>
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
        <div className="alert-box alert-danger" style={{ marginTop: '16px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '13.5px', marginBottom: '2px' }}>Parsing Error</strong>
            <span style={{ fontSize: '12.5px', opacity: 0.95 }}>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
