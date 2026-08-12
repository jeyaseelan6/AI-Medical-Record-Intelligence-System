import React from 'react';
import { ShieldAlert, AlertTriangle, TrendingUp, AlertCircle, Heart, Eye, Compass } from 'lucide-react';

const InsightCards = ({ insights, timeline, documents, onViewDocument, onFindCare }) => {
  
  // Helper to trace and match files by names or dates mentioned in the AI evidence
  const findEvidenceDocuments = (evidenceText, timelineList, documentsList) => {
    if (!evidenceText) return [];
    
    const matched = [];
    const seenUrls = new Set();
    const textLower = evidenceText.toLowerCase();

    // Helper to add unique doc
    const addMatch = (name, url) => {
      if (!name || !url) return;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        matched.push({ file_name: name, file_url: url });
      }
    };

    // 1. Scan timeline list events (which are the actual sources analyzed)
    if (timelineList && timelineList.length > 0) {
      timelineList.forEach(event => {
        const docName = (event.document_name || '').toLowerCase();
        const docUrl = event.document_url;
        
        // Match by filename in the evidence text
        if (docName && textLower.includes(docName)) {
          addMatch(event.document_name, docUrl);
          return;
        }

        // Match by date (e.g. "2019-10-03")
        if (event.event_date) {
          const dateStr = event.event_date.split('T')[0]; // "2019-10-03"
          if (textLower.includes(dateStr)) {
            addMatch(event.document_name, docUrl);
            return;
          }
          
          // Match by user-friendly dates (e.g. "Oct 03, 2019" -> check if "2019" and "oct" are both in text)
          const dateObj = new Date(event.event_date);
          const year = dateObj.getFullYear().toString();
          const monthShort = dateObj.toLocaleString('en-US', { month: 'short' }).toLowerCase();
          const monthLong = dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();
          if (textLower.includes(year) && (textLower.includes(monthShort) || textLower.includes(monthLong))) {
            addMatch(event.document_name, docUrl);
          }
        }
      });
    }

    // 2. Fallback scan uploaded documents list
    if (documentsList && documentsList.length > 0) {
      documentsList.forEach(doc => {
        const docName = (doc.file_name || '').toLowerCase();
        if (docName && textLower.includes(docName)) {
          addMatch(doc.file_name, doc.file_url);
        }
      });
    }

    return matched;
  };

  // Icon selector based on the type of intelligence report
  const getInsightIcon = (type) => {
    switch (type) {
      case 'duplicate_medication':
        return <ShieldAlert size={20} />;
      case 'dosage_conflict':
        return <AlertTriangle size={20} />;
      case 'trend_alert':
        return <TrendingUp size={20} />;
      case 'quality_issue':
        return <AlertCircle size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  // Human-readable title
  const getInsightTitle = (type) => {
    switch (type) {
      case 'duplicate_medication':
        return 'Duplicate Prescription Warning';
      case 'dosage_conflict':
        return 'Medication Dosage Conflict';
      case 'trend_alert':
        return 'Negative Vital Trajectory Alert';
      case 'quality_issue':
        return 'Record Inconsistency Alert';
      default:
        return 'Clinical Insight Alert';
    }
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="alert-box alert-success" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Heart size={18} fill="currentColor" />
          <span>Patient Logs Secure & Consistent</span>
        </div>
        <span style={{ fontSize: '12.5px', marginTop: '6px', opacity: 0.9 }}>
          No duplicate medications, dosage mismatches, or patient identity conflicts detected in uploaded history.
        </span>
      </div>
    );
  }

  return (
    <div>
      {insights.map((ins) => (
        <div key={ins.id} className={`insight-alert-item ${ins.insight_type}`}>
          <div className="insight-icon-container">
            {getInsightIcon(ins.insight_type)}
          </div>
          <div className="insight-body">
            <div className="insight-desc">
              {getInsightTitle(ins.insight_type)}
              {ins.confidence_score && (
                <span className="badge" style={{ 
                  backgroundColor: 'rgba(0,0,0,0.06)', 
                  color: 'inherit',
                  fontSize: '9px',
                  verticalAlign: 'middle'
                }}>
                  Conf. {Math.round(ins.confidence_score)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', margin: '4px 0 6px 0', lineHeight: 1.4 }}>
              {ins.description}
            </div>
            {ins.evidence && (
              <div className="insight-evidence" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <strong>Evidence Source: </strong> {ins.evidence}
                </div>
                {(() => {
                  const matchedDocs = findEvidenceDocuments(ins.evidence, timeline, documents);
                  if (matchedDocs.length === 0) return null;
                  
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Source Record Link:</span>
                      {matchedDocs.map((doc, idx) => (
                        <button
                          key={idx}
                          onClick={() => onViewDocument && onViewDocument({ file_name: doc.file_name, file_url: doc.file_url })}
                          style={{
                            background: 'rgba(20, 184, 166, 0.04)',
                            border: '1px solid rgba(20, 184, 166, 0.2)',
                            color: 'var(--color-primary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'underline'
                          }}
                        >
                          <Eye size={12} />
                          {doc.file_name}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Contextual Care Recommendation Button */}
            {onFindCare && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onFindCare(ins)}
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'var(--transition-fast)'
                  }}
                  title="Find nearby specialized doctors or clinics for this finding"
                >
                  <Compass size={13} />
                  <span>Find Local Care / Doctor</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Persistent Medical Safety Disclaimer */}
      <div className="disclaimer-banner">
        <strong>⚠️ Medical Intelligence Safety Notice</strong>
        <p style={{ marginTop: '4px' }}>
          This system organizes information compiled from uploaded patient medical files. It does not issue diagnostic claims, clinical prescriptions, or substitute doctor instructions. Always consult clinical practitioners prior to altering patient medication schedules.
        </p>
      </div>
    </div>
  );
};

export default InsightCards;
