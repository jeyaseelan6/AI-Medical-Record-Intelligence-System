import React from 'react';
import { Pill, Activity, Stethoscope, FileText, Calendar } from 'lucide-react';

const MedicalTimeline = ({ timeline }) => {
  
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

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
        <FileText size={32} style={{ color: 'var(--color-text-light)', marginBottom: '12px', display: 'inline-block' }} />
        <p style={{ fontSize: '14px' }}>No medical history logs found for this patient profile.</p>
        <p style={{ fontSize: '12px', opacity: 0.8 }}>Please upload patient records or prescriptions above to initialize the timeline.</p>
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {timeline.map((event) => {
        // Parse medications and lab results if string, else use directly
        const meds = typeof event.medications === 'string' ? JSON.parse(event.medications) : event.medications;
        const labs = typeof event.lab_results === 'string' ? JSON.parse(event.lab_results) : event.lab_results;

        return (
          <div key={event.id} className="timeline-event">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-meta">
                <span className="timeline-date">
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {formatDate(event.event_date)}
                </span>
                {event.doctor_name && (
                  <span className="timeline-doctor">
                    <Stethoscope size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {event.doctor_name}
                  </span>
                )}
              </div>

              {event.diagnosis && (
                <div className="timeline-diagnosis">
                  {event.diagnosis}
                </div>
              )}

              {event.symptoms && (
                <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                  <strong style={{ color: 'var(--color-text-muted)' }}>Symptoms: </strong>
                  <span>{event.symptoms}</span>
                </div>
              )}

              {event.notes && (
                <div style={{ fontSize: '13px', backgroundColor: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '12px', fontStyle: 'italic' }}>
                  {event.notes}
                </div>
              )}

              {/* Organized clinical logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                {/* Medications section */}
                {meds && meds.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      <Pill size={12} style={{ color: 'var(--color-success)' }} />
                      <span>Prescribed Medications</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {meds.map((med, idx) => (
                        <span key={idx} className="timeline-pill med" style={{ margin: 0 }} title={`Dosage: ${med.dosage || 'N/A'}, Frequency: ${med.frequency || 'N/A'}, Duration: ${med.duration || 'N/A'}`}>
                          <span>{med.medicine_name}</span>
                          {med.dosage && <span style={{ opacity: 0.7 }}>({med.dosage})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnostics / Labs section */}
                {labs && labs.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      <Activity size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>Diagnostics & Lab Orders</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {labs.map((lab, idx) => {
                        const cleanValue = (lab.value || '').trim();
                        // If lab value is empty or null, just show the test name (no trailing colon)
                        const showValue = cleanValue && cleanValue !== null && cleanValue !== '';
                        return (
                          <span key={idx} className="timeline-pill lab" style={{ margin: 0 }} title={`Normal: ${lab.normal_range || 'N/A'}`}>
                            <span>{lab.test_name}{showValue ? `: ${cleanValue} ${lab.unit || ''}` : ''}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {event.document_name && (
                <div style={{ 
                  marginTop: '12px', 
                  fontSize: '11px', 
                  color: 'var(--color-text-light)',
                  borderTop: '1px dashed var(--color-border)',
                  paddingTop: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Source Record:</span>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{event.document_name}</span>
                  </div>
                  {event.document_category && (
                    <span style={{ 
                      backgroundColor: 'rgba(13, 148, 136, 0.06)', 
                      color: 'var(--color-primary)', 
                      border: '1px solid rgba(13, 148, 136, 0.15)',
                      padding: '1px 8px', 
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {event.document_category}
                    </span>
                  )}
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
