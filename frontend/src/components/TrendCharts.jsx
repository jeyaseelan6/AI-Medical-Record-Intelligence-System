import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Info, TrendingUp, Activity, Heart, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../context/AuthContext.jsx';

const TrendCharts = ({ timeline, patientId }) => {
  const [selectedMetric, setSelectedMetric] = useState('');
  const [forecast, setForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [errorForecast, setErrorForecast] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      if (!patientId || !timeline || timeline.length === 0) {
        setForecast(null);
        return;
      }

      setLoadingForecast(true);
      setErrorForecast(null);
      try {
        const response = await api.get(`/insights/forecast/${patientId}`);
        if (response.data && response.data.success) {
          setForecast(response.data.data);
        } else {
          setErrorForecast(response.data?.message || 'Failed to load forecast data');
        }
      } catch (err) {
        console.error('[Forecast Fetch Error]', err.message);
        setErrorForecast('Unable to compile AI health forecast.');
      } finally {
        setLoadingForecast(false);
      }
    };

    fetchForecast();
  }, [timeline]);

  // Extract all numerical vitals and dynamically group them by normalized test names
  const groupedData = useMemo(() => {
    if (!timeline || timeline.length === 0) return {};
    
    // Process timeline in chronological order (oldest to newest for graphing)
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
        } else if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('sugar level')) {
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

        // Keep all points chronologically to allow plotting, making dates unique by appending a reference index
        groups[normalizedName].push({
          date: `${dateFormatted} (Ref #${event.id})`,
          displayDate: dateFormatted,
          val: numVal,
          unit: lab.unit || '',
          display: `${numVal}${lab.unit || ''}`
        });
      });
    });

    // Clean up empty groups
    const activeGroups = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        activeGroups[key] = groups[key];
      }
    });

    return activeGroups;
  }, [timeline]);

  const metricKeys = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Sync selected metric with available dynamic keys
  useEffect(() => {
    if (metricKeys.length > 0) {
      if (!selectedMetric || !metricKeys.includes(selectedMetric)) {
        setSelectedMetric(metricKeys[0]);
      }
    } else {
      setSelectedMetric('');
    }
  }, [metricKeys, selectedMetric]);

  const activeData = groupedData[selectedMetric] || [];

  return (
    <div>
      {/* Dynamic Tab Selector & Chart Canvas (Only if vitals keys exist) */}
      {metricKeys.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {metricKeys.map((key) => {
              const firstPoint = groupedData[key][0];
              const unitLabel = firstPoint && firstPoint.unit ? ` (${firstPoint.unit})` : '';
              const isActive = selectedMetric === key;
              
              return (
                <button
                  key={key}
                  className={`btn-secondary ${isActive ? 'active' : ''}`}
                  style={{ 
                    fontSize: '12.5px', 
                    padding: '6px 14px',
                    backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    fontWeight: isActive ? '600' : '400',
                    borderRadius: '20px'
                  }}
                  onClick={() => setSelectedMetric(key)}
                >
                  {key}{unitLabel}
                </button>
              );
            })}
          </div>

          {/* Chart Canvas / Single Point Card */}
          {activeData.length > 1 ? (
            <div style={{ width: '100%', height: 200, fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedMetric === 'Temperature' ? '#f43f5e' : '#14b8a6'} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={selectedMetric === 'Temperature' ? '#f43f5e' : '#14b8a6'} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-light)" tickFormatter={(tick) => tick.split(' (Ref')[0]} />
                  <YAxis 
                    domain={selectedMetric === 'Temperature' ? [35, 41] : ['auto', 'auto']} 
                    stroke="var(--color-text-light)" 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-md)',
                      fontSize: '12px'
                    }}
                    labelFormatter={(label, items) => {
                      const item = items[0]?.payload;
                      return item ? `Date: ${item.displayDate}` : label;
                    }}
                    formatter={(value, name, props) => [`${value} ${props.payload.unit || ''}`, selectedMetric]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="val" 
                    stroke={selectedMetric === 'Temperature' ? '#f43f5e' : '#14b8a6'} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    dot={{ r: 4, strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : activeData.length === 1 ? (
            <div style={{ 
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Single Vital Reading Recorded
                </span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                  {activeData[0].val} {activeData[0].unit}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Recorded on: <strong>{activeData[0].date}</strong>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div className="alert-box alert-info" style={{ margin: '0' }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '13.5px', marginBottom: '2px' }}>Vitals Trends Chart</strong>
              <span style={{ fontSize: '12.5px', opacity: 0.9 }}>
                No numeric vital measurements (such as Temperature, Weight, Blood Sugar, or Hemoglobin) were found in this patient's uploaded documents.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI-Native Predictive Forecasting Panel */}
      <div className="dashboard-card" style={{ marginTop: '24px', border: '1px solid var(--color-border)', padding: '20px' }}>
        <h3 className="card-title" style={{ marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--color-secondary)' }} />
          <span>AI Health Trajectory & Risk Forecast</span>
        </h3>

        {loadingForecast && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '8px' }}>
            <RefreshCw size={24} className="spinner" style={{ color: 'var(--color-secondary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Analyzing timeline and generating 30-day health projections...</span>
          </div>
        )}

        {errorForecast && (
          <div className="alert-box alert-danger" style={{ fontSize: '12.5px' }}>
            <AlertTriangle size={16} />
            <span>{errorForecast}</span>
          </div>
        )}

        {!loadingForecast && !errorForecast && forecast && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Row: Wellness text + Cardiovascular Risk Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
                  30-Day Wellness Forecast
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', fontFamily: 'var(--font-body)' }}>
                  {forecast.overall_wellness_forecast}
                </p>
              </div>

              {/* Cardiovascular Risk Badge */}
              <div style={{ 
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                minWidth: '180px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cardiovascular Risk Indicator
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={16} style={{ 
                    color: forecast.cardiovascular_risk_projection === 'High' 
                      ? 'var(--color-danger)' 
                      : forecast.cardiovascular_risk_projection === 'Moderate'
                      ? 'var(--color-warning)'
                      : forecast.cardiovascular_risk_projection === 'Low'
                      ? 'var(--color-success)'
                      : 'var(--color-text-light)'
                  }} />
                  <span style={{ 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: forecast.cardiovascular_risk_projection === 'High' 
                      ? 'var(--color-danger)' 
                      : forecast.cardiovascular_risk_projection === 'Moderate'
                      ? '#d97706'
                      : forecast.cardiovascular_risk_projection === 'Low'
                      ? 'var(--color-success)'
                      : 'var(--color-text-main)',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {forecast.cardiovascular_risk_projection}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Vitals Projections List (Filtered to hide insufficient data) */}
            {(() => {
              const visibleMetrics = (forecast.forecast_metrics || []).filter(
                item => (item.projected_trend || '').toLowerCase() !== 'insufficient data'
              );

              if (visibleMetrics.length === 0) return null;

              return (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                    Projected Vital Trajectories
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visibleMetrics.map((item, idx) => {
                      const trendColors = {
                        'Improving': { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--color-success)', border: 'rgba(16, 185, 129, 0.2)' },
                        'Stable': { bg: 'rgba(14, 165, 233, 0.08)', text: 'var(--color-secondary)', border: 'rgba(14, 165, 233, 0.2)' },
                        'Declining': { bg: 'rgba(244, 63, 94, 0.08)', text: 'var(--color-danger)', border: 'rgba(244, 63, 94, 0.2)' },
                        'Risk of Elevation': { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', border: 'rgba(245, 158, 11, 0.2)' }
                      };
                      const colorStyles = trendColors[item.projected_trend] || { bg: 'rgba(148, 163, 184, 0.08)', text: 'var(--color-text-muted)', border: 'var(--color-border)' };

                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '10px 14px', 
                            backgroundColor: 'var(--color-bg)', 
                            border: '1px solid var(--color-border)', 
                            borderRadius: 'var(--radius-sm)',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                              {item.metric}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'var(--font-body)' }}>
                              Current: {item.current_status || 'N/A'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              backgroundColor: colorStyles.bg,
                              color: colorStyles.text,
                              border: `1px solid ${colorStyles.border}`
                            }}>
                              {item.projected_trend}
                            </span>
                            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
                              {item.rationale}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Bottom Row: Ethics Safety Disclaimer */}
            <div className="alert-box alert-warning" style={{ margin: '0', fontSize: '11.5px', padding: '10px 12px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                {forecast.safety_disclaimer}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendCharts;
