import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Info, TrendingUp, Activity, Heart, Sparkles, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { api } from '../context/AuthContext.jsx';

const TrendCharts = ({ timeline, patientId, onViewDocument, forecast, loadingForecast, errorForecast, onFindCare }) => {
  const [expandedMetric, setExpandedMetric] = useState('');
  const [activeReadingIdx, setActiveReadingIdx] = useState(0);

  // Extract all numerical vitals and dynamically group them by normalized test names
  const groupedData = useMemo(() => {
    if (!timeline || timeline.length === 0) return {};
    
    // Process timeline in chronological order (oldest to newest for comparison navigation)
    const sortedTimeline = [...timeline].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    const groups = {};

    sortedTimeline.forEach((event) => {
      const labs = typeof event.lab_results === 'string' ? JSON.parse(event.lab_results) : event.lab_results;
      if (!labs || !Array.isArray(labs)) return;

      labs.forEach((lab) => {
        if (!lab.test_name || lab.value === undefined || lab.value === null) return;
        
        const rawName = lab.test_name.trim();
        const lowerName = rawName.toLowerCase();
        
        // Normalize names to group close variations together
        let normalizedName = rawName;
        if (lowerName.includes('temp')) {
          normalizedName = 'Temperature';
        } else if (lowerName.includes('weight') || lowerName === 'wt') {
          normalizedName = 'Weight';
        } else if (lowerName.includes('pulse') || lowerName.includes('heart rate') || lowerName === 'hr') {
          normalizedName = 'Heart Rate';
        } else if (lowerName.includes('hemoglobin') || lowerName === 'hb') {
          normalizedName = 'Hemoglobin';
        } else if (lowerName.includes('sugar') || lowerName === 'glucose') {
          normalizedName = 'Blood Sugar';
        } else if (lowerName.includes('systolic') || lowerName.includes('blood pressure') || lowerName === 'bp') {
          normalizedName = 'Blood Pressure';
        }
        
        const numVal = parseFloat(lab.value);
        if (isNaN(numVal)) return;

        const dateFormatted = new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!groups[normalizedName]) {
          groups[normalizedName] = [];
        }

        groups[normalizedName].push({
          date: `${dateFormatted} (Ref #${event.id})`,
          displayDate: dateFormatted,
          val: numVal,
          unit: lab.unit || '',
          document_name: event.document_name,
          document_url: event.document_url,
          doctor_name: event.doctor_name,
          event_date: event.event_date
        });
      });
    });

    const activeGroups = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        activeGroups[key] = groups[key];
      }
    });

    return activeGroups;
  }, [timeline]);

  const metricKeys = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Sync selected index to point to the latest reading when expandedMetric changes
  useEffect(() => {
    if (expandedMetric && groupedData[expandedMetric]) {
      setActiveReadingIdx(groupedData[expandedMetric].length - 1);
    } else {
      setActiveReadingIdx(0);
    }
  }, [expandedMetric, groupedData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>

      {loadingForecast && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '12px' }}>
          <RefreshCw size={28} className="spinner" style={{ color: 'var(--color-secondary)' }} />
          <span style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
            Compiling clinical timeline logs and generating wellness projections...
          </span>
        </div>
      )}

      {errorForecast && (
        <div className="alert-box alert-danger" style={{ fontSize: '12.5px' }}>
          <AlertTriangle size={16} />
          <span>{errorForecast}</span>
        </div>
      )}

      {!loadingForecast && !errorForecast && forecast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            flexWrap: 'wrap-reverse', 
            gap: '20px',
            backgroundColor: 'var(--color-bg)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '6px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                30-Day Wellness Outlook
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}>
                {forecast.overall_wellness_forecast}
              </p>
            </div>

            {(() => {
              const getRiskStyles = (risk) => {
                const level = (risk || '').toLowerCase().trim();
                if (level === 'high') {
                  return {
                    bg: 'rgba(244, 63, 94, 0.04)',
                    border: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--color-danger)',
                    text: 'High Risk'
                  };
                }
                if (level === 'moderate') {
                  return {
                    bg: 'rgba(245, 158, 11, 0.04)',
                    border: 'rgba(245, 158, 11, 0.15)',
                    color: '#d97706',
                    text: 'Moderate Risk'
                  };
                }
                if (level === 'low') {
                  return {
                    bg: 'rgba(16, 185, 129, 0.04)',
                    border: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--color-success)',
                    text: 'Low Risk'
                  };
                }
                return {
                  bg: 'rgba(148, 163, 184, 0.04)',
                  border: 'rgba(148, 163, 184, 0.15)',
                  color: 'var(--color-text-muted)',
                  text: 'Not Enough Data'
                };
              };
              const riskStyle = getRiskStyles(forecast.cardiovascular_risk_projection);
              return (
                <div style={{ 
                  backgroundColor: riskStyle.bg,
                  border: `1px solid ${riskStyle.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 18px',
                  minWidth: '185px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                    Cardiovascular Risk
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart 
                      size={16} 
                      fill={riskStyle.color === 'var(--color-text-muted)' ? 'none' : riskStyle.color} 
                      style={{ color: riskStyle.color }} 
                    />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 800, 
                      color: riskStyle.color,
                      fontFamily: 'var(--font-display)',
                      textTransform: 'uppercase'
                    }}>
                      {riskStyle.text}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '12px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Projected Vital Trajectories & History Logs
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const allKeys = [...metricKeys];
                
                (forecast.forecast_metrics || []).forEach(item => {
                  if (item.metric && !allKeys.includes(item.metric)) {
                    allKeys.push(item.metric);
                  }
                });

                const visibleKeys = allKeys.filter(key => {
                  const historyPoints = groupedData[key] || [];
                  if (historyPoints.length === 0) {
                    return false;
                  }
                  
                  const forecastItem = (forecast.forecast_metrics || []).find(
                    item => item.metric.toLowerCase() === key.toLowerCase()
                  );
                  if (!forecastItem) {
                    return false;
                  }
                  
                  const trend = (forecastItem.projected_trend || '').toLowerCase();
                  return ['improving', 'stable', 'declining', 'risk of elevation'].includes(trend);
                });

                if (visibleKeys.length === 0) {
                  return (
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '12px' }}>
                      No projected vitals or metrics history available.
                    </div>
                  );
                }

                return visibleKeys.map((key) => {
                  const historyPoints = groupedData[key] || [];
                  const currentReading = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
                  
                  const forecastItem = (forecast.forecast_metrics || []).find(
                    item => item.metric.toLowerCase() === key.toLowerCase()
                  );

                  const trendText = forecastItem ? forecastItem.projected_trend : 'Historical Data';
                  const rationaleText = forecastItem ? forecastItem.rationale : 'Historical vital records logs parsed from document uploads.';

                  const trendColors = {
                    'Improving': { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--color-success)', border: 'rgba(16, 185, 129, 0.2)' },
                    'Stable': { bg: 'rgba(14, 165, 233, 0.08)', text: 'var(--color-secondary)', border: 'rgba(14, 165, 233, 0.2)' },
                    'Declining': { bg: 'rgba(244, 63, 94, 0.08)', text: 'var(--color-danger)', border: 'rgba(244, 63, 94, 0.2)' },
                    'Risk of Elevation': { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', border: 'rgba(245, 158, 11, 0.2)' },
                    'Historical Data': { bg: 'rgba(100, 116, 139, 0.08)', text: 'var(--color-text-muted)', border: 'var(--color-border)' }
                  };
                  const colorStyles = trendColors[trendText] || { bg: 'rgba(148, 163, 184, 0.08)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };

                  const isExpanded = expandedMetric === key;

                  return (
                    <div 
                      key={key} 
                      style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: 'var(--radius-md)', 
                        backgroundColor: isExpanded ? 'var(--color-bg)' : 'var(--color-surface)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Card Content Header Row */}
                      <div 
                        onClick={() => setExpandedMetric(isExpanded ? '' : key)}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '180px 130px 1fr auto', 
                          alignItems: 'center', 
                          padding: '12px 20px', 
                          gap: '16px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        {/* Col 1: Metric name and latest current value */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                            {key}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                            Current: <strong style={{ color: 'var(--color-text-main)' }}>{currentReading ? `${currentReading.val} ${currentReading.unit}` : 'N/A'}</strong>
                          </span>
                        </div>

                        {/* Col 2: Trend Badge */}
                        <div>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 600, 
                            padding: '3px 8px', 
                            borderRadius: '12px',
                            backgroundColor: colorStyles.bg,
                            color: colorStyles.text,
                            border: `1px solid ${colorStyles.border}`,
                            display: 'inline-block',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px'
                          }}>
                            {trendText}
                          </span>
                        </div>

                        {/* Col 3: Rationale */}
                        <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: '1.4', fontFamily: 'var(--font-body)', paddingRight: '8px' }}>
                          {rationaleText}
                        </div>

                        {/* Col 4: Expand/Collapse Trigger */}
                        <div style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700 }}>
                          {isExpanded ? 'Hide ▲' : 'View History ▼'}
                        </div>
                      </div>

                      {/* Collapsible history carousel drawer */}
                      {isExpanded && historyPoints.length > 0 && (
                        <div style={{ 
                          borderTop: '1px solid var(--color-border)', 
                          padding: '16px 20px',
                          backgroundColor: 'var(--color-bg)'
                        }}>
                          {(() => {
                            const currentReading = historyPoints[activeReadingIdx];
                            if (!currentReading) return null;

                            const hasPrevious = activeReadingIdx > 0;
                            const prevReading = hasPrevious ? historyPoints[activeReadingIdx - 1] : null;
                            let diffText = '';
                            let diffColor = 'var(--color-text-muted)';
                            let diffIcon = null;

                            if (prevReading) {
                              const diff = currentReading.val - prevReading.val;
                              const formattedDiff = Math.abs(diff).toFixed(1).replace(/\.0$/, '');
                              if (diff > 0) {
                                diffText = `+${formattedDiff} ${currentReading.unit} since prev`;
                                diffColor = key === 'Temperature' || key === 'Blood Sugar' ? 'var(--color-danger)' : 'var(--color-primary)';
                                diffIcon = <TrendingUp size={12} style={{ color: diffColor, marginRight: '3px', verticalAlign: 'middle' }} />;
                              } else if (diff < 0) {
                                diffText = `-${formattedDiff} ${currentReading.unit} since prev`;
                                diffColor = 'var(--color-success)';
                                diffIcon = <TrendingUp size={12} style={{ color: diffColor, transform: 'rotate(180deg)', marginRight: '3px', verticalAlign: 'middle' }} />;
                              } else {
                                diffText = 'No change';
                                diffColor = 'var(--color-text-light)';
                              }
                            } else {
                              diffText = 'Baseline';
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  {historyPoints.length > 1 ? (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        activeReadingIdx > 0 && setActiveReadingIdx(activeReadingIdx - 1);
                                      }}
                                      disabled={activeReadingIdx === 0}
                                      style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%', 
                                        border: '1px solid var(--color-border)', 
                                        backgroundColor: 'var(--color-surface)',
                                        color: activeReadingIdx === 0 ? 'var(--color-text-light)' : 'var(--color-text-main)',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: activeReadingIdx === 0 ? 'not-allowed' : 'pointer',
                                        opacity: activeReadingIdx === 0 ? 0.3 : 1,
                                        boxShadow: 'var(--shadow-sm)',
                                        padding: 0
                                      }}
                                    >
                                      <ChevronLeft size={14} />
                                    </button>
                                  ) : <div style={{ width: '28px' }} />}

                                  <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '9px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Log {activeReadingIdx + 1} of {historyPoints.length}
                                    </span>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                                      {currentReading.val} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)' }}>{currentReading.unit}</span>
                                    </div>
                                  </div>

                                  {historyPoints.length > 1 ? (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        activeReadingIdx < historyPoints.length - 1 && setActiveReadingIdx(activeReadingIdx + 1);
                                      }}
                                      disabled={activeReadingIdx === historyPoints.length - 1}
                                      style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%', 
                                        border: '1px solid var(--color-border)', 
                                        backgroundColor: 'var(--color-surface)',
                                        color: activeReadingIdx === historyPoints.length - 1 ? 'var(--color-text-light)' : 'var(--color-text-main)',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: activeReadingIdx === historyPoints.length - 1 ? 'not-allowed' : 'pointer',
                                        opacity: activeReadingIdx === historyPoints.length - 1 ? 0.3 : 1,
                                        boxShadow: 'var(--shadow-sm)',
                                        padding: 0
                                      }}
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  ) : <div style={{ width: '28px' }} />}
                                </div>

                                <div style={{ 
                                  textAlign: 'center', 
                                  fontSize: '11px', 
                                  color: 'var(--color-text-muted)',
                                  borderTop: '1px dashed var(--color-border)',
                                  paddingTop: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  lineHeight: '1.4'
                                }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: diffColor }}>
                                    {diffIcon}
                                    <strong>{diffText}</strong>
                                  </div>
                                  <span>
                                    Recorded: <strong>{new Date(currentReading.event_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</strong>
                                  </span>
                                  {currentReading.document_name && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '2px' }}>
                                      <span>Source:</span>
                                      {onViewDocument && currentReading.document_url ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDocument({ file_name: currentReading.document_name, file_url: currentReading.document_url });
                                          }}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer',
                                            padding: 0,
                                            textDecoration: 'underline',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            maxWidth: '130px'
                                          }}
                                        >
                                          {currentReading.document_name}
                                        </button>
                                      ) : (
                                        <span style={{ color: 'var(--color-text-light)' }}>{currentReading.document_name}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="alert-box alert-warning" style={{ margin: '0', fontSize: '11.5px', padding: '10px 12px' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              {forecast.safety_disclaimer}
            </span>
          </div>

          {onFindCare && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                onClick={() => onFindCare({
                  issueType: 'trend_alert',
                  riskLevel: forecast.overall_risk_level || 'moderate',
                  clinicalSummary: `Negative trajectory or risk alert in health forecast: ${forecast.clinical_summary || 'Trajectory monitoring required.'}`,
                  patientAge: null,
                  patientGender: null
                })}
                style={{
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)'
                }}
              >
                <Compass size={14} />
                <span>Find Local Care for this Forecast</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendCharts;
