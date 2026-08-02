import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Info } from 'lucide-react';

const TrendCharts = ({ timeline }) => {
  const [selectedMetric, setSelectedMetric] = useState('');

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

        // Avoid adding duplicate points on the exact same day
        const dayExists = groups[normalizedName].some(pt => pt.date === dateFormatted && pt.val === numVal);
        if (!dayExists) {
          groups[normalizedName].push({
            date: dateFormatted,
            val: numVal,
            unit: lab.unit || '',
            display: `${numVal}${lab.unit || ''}`
          });
        }
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

  // Render empty state if no numeric trend values exist
  if (metricKeys.length === 0) {
    return (
      <div style={{ padding: '24px 12px' }}>
        <div className="alert-box alert-info">
          <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '13.5px', marginBottom: '2px' }}>Vitals Trends</strong>
            <span style={{ fontSize: '12.5px', opacity: 0.9 }}>
              No numeric vital entries parsed from records. 
              Vitals values (e.g. Temperature, Weight, Blood Sugar, or Hemoglobin) extracted from prescription files or lab reports will chart here.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const activeData = groupedData[selectedMetric] || [];

  return (
    <div>
      {/* Dynamic Tab Selector */}
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

      {/* Chart Canvas */}
      {activeData.length > 0 && (
        <div style={{ width: '100%', height: 200, fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <ResponsiveContainer>
            <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedMetric === 'Temperature' ? 'var(--color-danger)' : 'var(--color-primary)'} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={selectedMetric === 'Temperature' ? 'var(--color-danger)' : 'var(--color-primary)'} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-light)" />
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
                formatter={(value, name, props) => [`${value} ${props.payload.unit || ''}`, selectedMetric]}
              />
              <Area 
                type="monotone" 
                dataKey="val" 
                stroke={selectedMetric === 'Temperature' ? 'var(--color-danger)' : 'var(--color-primary)'} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVal)" 
                dot={{ r: 4, strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TrendCharts;
