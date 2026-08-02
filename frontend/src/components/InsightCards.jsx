import React from 'react';
import { ShieldAlert, AlertTriangle, TrendingUp, AlertCircle, Heart } from 'lucide-react';

const InsightCards = ({ insights }) => {
  
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
              <div className="insight-evidence">
                <strong>Evidence Source: </strong> {ins.evidence}
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
