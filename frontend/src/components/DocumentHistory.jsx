import React from 'react';
import { FileText, Image, ExternalLink, RefreshCw } from 'lucide-react';

const DocumentHistory = ({ documents, loading, onViewDocument }) => {
  
  // Choose correct icon based on document filename/extension
  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['png', 'jpg', 'jpeg'].includes(ext)) {
      return <Image size={18} style={{ color: 'var(--color-secondary)' }} />;
    }
    return <FileText size={18} style={{ color: 'var(--color-primary)' }} />;
  };

  // View the file inside a modal dialog or fallback to a new tab
  const handleViewFile = (doc) => {
    if (onViewDocument) {
      onViewDocument(doc);
    } else {
      window.open(`http://localhost:5000${doc.file_url}`, '_blank');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'timeline-pill med'; // Teal pill
      case 'Processing':
        return 'timeline-pill lab'; // Blue pill
      case 'Failed':
        return 'insight-alert-item duplicate_medication'; // Small red block style (custom styling below)
      default:
        return 'timeline-pill';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <div className="spinner-primary" style={{ width: '20px', height: '20px' }}></div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
      {documents.map((doc) => (
        <div 
          key={doc.id}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px 14px', 
            backgroundColor: 'var(--color-bg)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 'var(--radius-md)',
            transition: 'var(--transition-fast)',
            cursor: doc.processing_status === 'Completed' ? 'pointer' : 'default'
          }}
          className={doc.processing_status === 'Completed' ? 'document-row-hover' : ''}
          onClick={() => doc.processing_status === 'Completed' && handleViewFile(doc)}
        >
          {/* File details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {getFileIcon(doc.file_name)}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ 
                fontSize: '13.5px', 
                fontWeight: 500, 
                color: 'var(--color-text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={doc.file_name}>
                {doc.file_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>Type: {doc.document_type || 'Unclassified'}</span>
                <span>•</span>
                <span>{new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Action / Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
            {doc.processing_status === 'Processing' && (
              <span className={getStatusBadgeClass(doc.processing_status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '10px' }}>
                <RefreshCw size={10} className="spinner" style={{ borderTopColor: 'var(--color-secondary)' }} />
                Processing
              </span>
            )}
            
            {doc.processing_status === 'Completed' && (
              <>
                <span className={getStatusBadgeClass(doc.processing_status)} style={{ padding: '2px 8px', fontSize: '10px' }}>
                  Ready
                </span>
                <ExternalLink size={14} style={{ color: 'var(--color-text-light)' }} />
              </>
            )}

            {doc.processing_status === 'Failed' && (
              <span style={{ 
                backgroundColor: 'var(--color-danger-bg)', 
                color: '#b91c1c', 
                border: '1px solid #fee2e2',
                padding: '2px 8px', 
                borderRadius: '20px',
                fontSize: '10px' 
              }}>
                Failed
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentHistory;
