import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Info } from 'lucide-react';

const TrendCharts = ({ timeline }) => {
  const [activeTab, setActiveTab] = useState('temp'); // 'temp' or 'weight'

  // Extract numerical vitals sorted chronologically (oldest first for chart line direction)
  const chartData = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    
    // Process timeline in chronological order (oldest to newest for graphing)
    const sortedTimeline = [...timeline].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    const tempPoints = [];
    const weightPoints = [];

    sortedTimeline.forEach((event) => {
      const labs = typeof event.lab_results === 'string' ? JSON.parse(event.lab_results) : event.lab_results;
      if (!labs) return;

      labs.forEach((lab) => {
        const name = lab.test_name.toLowerCase();
        const numVal = parseFloat(lab.value);
        if (isNaN(numVal)) return;

        const dateFormatted = new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (name.includes('temp')) {
          tempPoints.push({
            date: dateFormatted,
            val: numVal,
            unit: lab.unit || '°C',
            display: `${numVal}${lab.unit || '°C'}`
          });
        } else if (name.includes('weight') || name === 'wt') {
          weightPoints.push({
            date: dateFormatted,
            val: numVal,
            unit: lab.unit || 'kg',
            display: `${numVal}${lab.unit || 'kg'}`
          });
        }
      });
    });

    return { temp: tempPoints, weight: weightPoints };
  }, [timeline]);

  // Read active data list
  const activeData = activeTab === 'temp' ? chartData.temp : chartData.weight;

  // Render empty state if no numeric trend values
  if (!activeData || activeData.length === 0) {
    const alternateData = activeTab === 'temp' ? chartData.weight : chartData.temp;
    
    // Auto toggle to the other tab if it has data
    if (alternateData && alternateData.length > 0) {
      setActiveTab(activeTab === 'temp' ? 'weight' : 'temp');
    }

    return (
      <div style={{ padding: '24px 12px' }}>
        <div style={{ display: 'flex', gap: '10px', padding: '14px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-secondary)' }} />
          <div>
            <strong>Vitals Tracking</strong>
            <p style={{ marginTop: '2px', fontSize: '12px' }}>
              No {activeTab === 'temp' ? 'body temperature' : 'weight'} entries parsed from records. 
              Vitals values (e.g. Test: Temperature, Value: 38.2, Unit: C) contained in prescriptions/reports will chart here.
            </p>
          </div>
        </div>
        
        {/* Toggle option if alternate has data */}
        {alternateData && alternateData.length > 0 && (
          <button 
            className="btn-secondary" 
            style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setActiveTab(activeTab === 'temp' ? 'weight' : 'temp')}
          >
            Switch to {activeTab === 'temp' ? 'Weight' : 'Temperature'} Chart
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Chart Metric Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn-secondary ${activeTab === 'temp' ? 'active' : ''}`}
          style={{ 
            fontSize: '13px', 
            padding: '6px 14px',
            backgroundColor: activeTab === 'temp' ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: activeTab === 'temp' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderColor: activeTab === 'temp' ? 'var(--color-primary)' : 'var(--color-border)',
            fontWeight: activeTab === 'temp' ? '600' : '400'
          }}
          onClick={() => setActiveTab('temp')}
        >
          Body Temp (°C)
        </button>
        <button
          className={`btn-secondary ${activeTab === 'weight' ? 'active' : ''}`}
          style={{ 
            fontSize: '13px', 
            padding: '6px 14px',
            backgroundColor: activeTab === 'weight' ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: activeTab === 'weight' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderColor: activeTab === 'weight' ? 'var(--color-primary)' : 'var(--color-border)',
            fontWeight: activeTab === 'weight' ? '600' : '400'
          }}
          onClick={() => setActiveTab('weight')}
        >
          Body Weight (kg)
        </button>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height: 200, fontSize: '11px', color: 'var(--color-text-muted)' }}>
        <ResponsiveContainer>
          <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeTab === 'temp' ? 'var(--color-danger)' : 'var(--color-primary)'} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={activeTab === 'temp' ? 'var(--color-danger)' : 'var(--color-primary)'} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-text-light)" />
            <YAxis 
              domain={activeTab === 'temp' ? [35, 41] : ['auto', 'auto']} 
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
              formatter={(value, name, props) => [`${value} ${props.payload.unit}`, activeTab === 'temp' ? 'Temperature' : 'Weight']}
            />
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={activeTab === 'temp' ? 'var(--color-danger)' : 'var(--color-primary)'} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorVal)" 
              dot={{ r: 4, strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendCharts;
