import React from 'react';
import { Pill, Activity, Stethoscope, FileText, Calendar, Eye } from 'lucide-react';

const MedicalTimeline = ({ timeline, onViewDocument }) => {
  
  // Format dates nicely (e.g. "03 Oct 2019")
  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'short', day: '2-digit' };
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateString;
    }
  };

  const getCategoryBadgeStyle = (category) => {
    const type = (category || '').toLowerCase();
    
    let bg = 'rgba(148, 163, 184, 0.08)';
    let color = 'var(--color-text-muted)';
    let border = 'rgba(148, 163, 184, 0.2)';
    
    if (type.includes('prescription')) {
      bg = 'rgba(16, 185, 129, 0.08)';
      color = 'var(--color-success)';
      border = 'rgba(16, 185, 129, 0.2)';
    } else if (type.includes('report') || type.includes('lab')) {
      bg = 'rgba(20, 184, 166, 0.08)';
      color = 'var(--color-primary)';
      border = 'rgba(20, 184, 166, 0.2)';
    } else if (type.includes('discharge') || type.includes('summary')) {
      bg = 'rgba(139, 92, 246, 0.08)';
      color = '#8b5cf6';
      border = 'rgba(139, 92, 246, 0.2)';
    } else if (type.includes('notes') || type.includes('medical')) {
      bg = 'rgba(245, 158, 11, 0.08)';
      color = '#d97706';
      border = 'rgba(245, 158, 11, 0.2)';
    }
    
    return {
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };
  };

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
        <FileText size={32} style={{ color: 'var(--color-text-light)', marginBottom: '12px', display: 'inline-block' }} />
        <p style={{ fontSize: '14px' }}>No medical history logs found for this patient profile.</p>
        <p style={{ fontSize: '12px', opacity: 0.8 }}>Please upload patient records or prescriptions above to initialize the timeline.</p>
      </div>
    );
  }

  const getCategoryMarker = (category) => {
    const type = (category || '').toLowerCase();
    let bg = '#64748b';
    let icon = <FileText size={13} style={{ color: 'white' }} />;

    if (type.includes('prescription')) {
      bg = 'var(--color-success)';
      icon = <Pill size={13} style={{ color: 'white' }} />;
    } else if (type.includes('report') || type.includes('lab')) {
      bg = 'var(--color-primary)';
      icon = <Activity size={13} style={{ color: 'white' }} />;
    } else if (type.includes('discharge') || type.includes('summary')) {
      bg = '#8b5cf6';
      icon = <FileText size={13} style={{ color: 'white' }} />;
    } else if (type.includes('notes') || type.includes('medical')) {
      bg = '#f59e0b';
      icon = <Stethoscope size={13} style={{ color: 'white' }} />;
    }

    return (
      <div 
        style={{
          position: 'absolute',
          left: '-32px',
          top: '8px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxShadow: '0 0 0 4px var(--color-bg), 0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {icon}
      </div>
    );
  };

  return (
    <div className="timeline-list">
      {timeline.map((event) => {
        // Parse medications and lab results if string, else use directly
        const meds = typeof event.medications === 'string' ? JSON.parse(event.medications) : event.medications;
        const labs = typeof event.lab_results === 'string' ? JSON.parse(event.lab_results) : event.lab_results;

        return (
          <div key={event.id} className="timeline-event" style={{ marginBottom: '32px' }}>
            {getCategoryMarker(event.document_category)}
            <div className="timeline-content" style={{ padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              
              {/* Header block */}
              <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="timeline-date" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    <Calendar size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', marginTop: '-2px' }} />
                    {formatDate(event.event_date)}
                  </span>
                  {event.doctor_name && (
                    <span className="timeline-doctor" style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Stethoscope size={13} style={{ marginTop: '1px' }} />
                      {event.doctor_name}
                    </span>
                  )}
                </div>
                {event.document_category && (
                  <span style={getCategoryBadgeStyle(event.document_category)}>
                    {event.document_category}
                  </span>
                )}
              </div>

              {/* Diagnosis title */}
              <h4 className="timeline-diagnosis" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                {event.diagnosis || 'Clinical Consultation'}
              </h4>

              {/* Symptoms */}
              {event.symptoms && (
                <div style={{ marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ height: '6px', width: '6px', backgroundColor: 'var(--color-warning)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }}></span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    <strong>Symptoms: </strong>{event.symptoms}
                  </span>
                </div>
              )}

              {/* Doctor notes with left-accent highlight */}
              {event.notes && (
                <div style={{ 
                  fontSize: '13px', 
                  backgroundColor: 'rgba(14, 165, 233, 0.02)', 
                  padding: '12px 16px', 
                  borderRadius: 'var(--radius-sm)', 
                  borderLeft: '3px solid var(--color-secondary)',
                  borderTop: '1px solid var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: '16px', 
                  fontStyle: 'italic',
                  color: 'var(--color-text-muted)',
                  lineHeight: '1.5'
                }}>
                  "{event.notes}"
                </div>
              )}

              {/* Organized clinical logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Medications section */}
                {meds && meds.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      <Pill size={12} style={{ color: 'var(--color-success)' }} />
                      <span>Prescribed Medications</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {meds.map((med, idx) => (
                        <span 
                          key={idx} 
                          className="timeline-pill med" 
                          style={{ 
                            margin: 0, 
                            padding: '6px 12px', 
                            fontSize: '12px', 
                            borderRadius: '8px', 
                            backgroundColor: 'rgba(16, 185, 129, 0.04)', 
                            border: '1px solid rgba(16, 185, 129, 0.12)', 
                            color: '#065f46',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }} 
                          title={`Dosage: ${med.dosage || 'N/A'}, Frequency: ${med.frequency || 'N/A'}, Duration: ${med.duration || 'N/A'}`}
                        >
                          <strong>{med.medicine_name}</strong>
                          {med.dosage && <span style={{ opacity: 0.8 }}>({med.dosage})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnostics / Labs section */}
                {labs && labs.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      <Activity size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>Diagnostics & Lab Orders</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {labs.map((lab, idx) => {
                        const cleanValue = (lab.value || '').trim();
                        const showValue = cleanValue && cleanValue !== null && cleanValue !== '';
                        return (
                          <span 
                            key={idx} 
                            className="timeline-pill lab" 
                            style={{ 
                              margin: 0, 
                              padding: '6px 12px', 
                              fontSize: '12px', 
                              borderRadius: '8px', 
                              backgroundColor: 'rgba(20, 184, 166, 0.04)', 
                              border: '1px solid rgba(20, 184, 166, 0.12)', 
                              color: '#0f766e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }} 
                            title={`Normal: ${lab.normal_range || 'N/A'}`}
                          >
                            <span>{lab.test_name}</span>
                            {showValue && <strong style={{ color: '#0d9488', marginLeft: '2px' }}>{cleanValue} {lab.unit || ''}</strong>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {event.document_name && (
                <div style={{ 
                  marginTop: '16px', 
                  fontSize: '11px', 
                  color: 'var(--color-text-light)',
                  borderTop: '1px dashed var(--color-border)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Source Record:</span>
                    {onViewDocument && event.document_url ? (
                      <button
                        onClick={() => onViewDocument({ file_name: event.document_name, file_url: event.document_url })}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0',
                          textDecoration: 'underline',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {event.document_name}
                        <Eye size={12} />
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{event.document_name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MedicalTimeline;
