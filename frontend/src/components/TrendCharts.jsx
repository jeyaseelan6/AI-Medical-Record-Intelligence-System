import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, TrendingUp, ChevronLeft, ChevronRight, FileText, Info } from 'lucide-react';

/**
 * TrendCharts Component
 * 
 * Renders chronological historical vital readings and lab metrics parsed strictly
 * from uploaded patient medical documents.
 * 
 * Strict Clinical Safety Constraints:
 * - 100% Verified Historical Data: Plots only actual documented measurements.
 * - Zero Extrapolation: No predictive curves, future regression lines, or forecast projections.
 * - Source Traceability: Links every historical reading to its source medical document.
 */
const TrendCharts = ({ timeline, onViewDocument }) => {
  const [expandedMetric, setExpandedMetric] = useState('');
  const [activeReadingIdx, setActiveReadingIdx] = useState(0);

  // Extract all numerical vitals and dynamically group them by normalized test names
  const groupedData = useMemo(() => {
    if (!timeline || timeline.length === 0) return {};
    
    // Process timeline in chronological order (oldest to newest for accurate historical progression)
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

  if (metricKeys.length === 0) {
    return (
      <div className="dashboard-card" style={{ padding: '36px 20px', textAlign: 'center' }}>
        <Activity size={32} style={{ color: 'var(--color-text-light)', margin: '0 auto 10px auto' }} />
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
          No Numerical Vital Measurements Found
        </h4>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
          Upload patient lab reports or clinical consultation notes containing vitals (e.g. Blood Pressure, Blood Sugar, Temperature, Weight) to view historical measurements.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '6px' }}>
      
      {/* Historical Data Notice Banner */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        backgroundColor: 'var(--color-bg)', 
        padding: '10px 14px', 
        borderRadius: 'var(--radius-sm)', 
        border: '1px solid var(--color-border)',
        fontSize: '12px',
        color: 'var(--color-text-muted)'
      }}>
        <Info size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span>
          Showing <strong>{metricKeys.length}</strong> documented historical metric trajectories parsed directly from uploaded clinical records.
        </span>
      </div>

      {/* Metric Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {metricKeys.map((key) => {
          const historyPoints = groupedData[key] || [];
          const latestReading = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
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
              {/* Card Header Row */}
              <div 
                onClick={() => setExpandedMetric(isExpanded ? '' : key)}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '200px 160px 1fr auto', 
                  alignItems: 'center', 
                  padding: '14px 20px', 
                  gap: '16px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                {/* Col 1: Metric Name & Total Documented Logs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                    {key}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {historyPoints.length} {historyPoints.length === 1 ? 'documented reading' : 'historical readings'}
                  </span>
                </div>

                {/* Col 2: Latest Documented Value */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>
                    Latest Recorded
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    {latestReading ? `${latestReading.val} ${latestReading.unit}` : 'N/A'}
                  </span>
                </div>

                {/* Col 3: Latest Date & Source Document */}
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {latestReading && (
                    <span>
                      Recorded on <strong>{new Date(latestReading.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      {latestReading.document_name && ` (${latestReading.document_name})`}
                    </span>
                  )}
                </div>

                {/* Col 4: Expand/Collapse Trigger */}
                <div style={{ color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700 }}>
                  {isExpanded ? 'Hide History ▲' : 'View History ▼'}
                </div>
              </div>

              {/* Collapsible History Drawer & Chart */}
              {isExpanded && historyPoints.length > 0 && (
                <div style={{ 
                  borderTop: '1px solid var(--color-border)', 
                  padding: '18px 20px',
                  backgroundColor: 'var(--color-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  
                  {/* Historical AreaChart strictly plotting observed data */}
                  {historyPoints.length > 1 && (
                    <div style={{ height: '180px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                          <XAxis dataKey="displayDate" stroke="var(--color-text-light)" fontSize={11} />
                          <YAxis stroke="var(--color-text-light)" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--color-surface)', 
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value} ${historyPoints[0]?.unit || ''}`, key]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke="var(--color-primary)" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill={`url(#grad_${key})`} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Reading Navigator Carousel */}
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
                        diffColor = 'var(--color-primary)';
                        diffIcon = <TrendingUp size={12} style={{ color: diffColor, marginRight: '3px', verticalAlign: 'middle' }} />;
                      } else if (diff < 0) {
                        diffText = `-${formattedDiff} ${currentReading.unit} since prev`;
                        diffColor = 'var(--color-secondary)';
                        diffIcon = <TrendingUp size={12} style={{ color: diffColor, transform: 'rotate(180deg)', marginRight: '3px', verticalAlign: 'middle' }} />;
                      } else {
                        diffText = 'No change';
                        diffColor = 'var(--color-text-light)';
                      }
                    } else {
                      diffText = 'Initial Baseline';
                    }

                    return (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px',
                        backgroundColor: 'var(--color-surface)',
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)'
                      }}>
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
                                backgroundColor: 'var(--color-bg)',
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
                              Observation {activeReadingIdx + 1} of {historyPoints.length}
                            </span>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                              {currentReading.val} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>{currentReading.unit}</span>
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
                                backgroundColor: 'var(--color-bg)',
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
                          fontSize: '11.5px', 
                          color: 'var(--color-text-muted)',
                          borderTop: '1px dashed var(--color-border)',
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          lineHeight: '1.4'
                        }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: diffColor }}>
                            {diffIcon}
                            <strong>{diffText}</strong>
                          </div>
                          <span>
                            Recorded Date: <strong>{new Date(currentReading.event_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</strong>
                          </span>
                          {currentReading.document_name && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                              <FileText size={11} style={{ color: 'var(--color-text-light)' }} />
                              <span>Source Document:</span>
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
                                    fontSize: '11.5px',
                                    fontWeight: 600
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
        })}
      </div>
    </div>
  );
};

export default TrendCharts;
