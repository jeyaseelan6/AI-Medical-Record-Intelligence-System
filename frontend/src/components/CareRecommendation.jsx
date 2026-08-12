import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext.jsx';
import { 
  Compass, MapPin, Search, Stethoscope, Building2, Phone, ExternalLink, 
  ChevronRight, Shield, Award, Clock, History, AlertCircle, CheckCircle, 
  Info, Sparkles, Navigation, X, Sliders, RefreshCw
} from 'lucide-react';

/**
 * CareRecommendation Component
 * 
 * Round 2 Local Doctor & Care Recommendation Engine.
 * Connects AI clinical findings to real-world healthcare providers.
 * 
 * Core UX Principles:
 * - 100% Real public healthcare providers (Zero synthetic doctors/ratings).
 * - Clear distinction between AI care navigation and clinical diagnosis.
 * - Transparent multi-factor match score breakdown (0-100 pts).
 * - Direct map navigation and phone dialer integration.
 * - Patient audit session history.
 */
const CareRecommendation = ({ 
  patientId, 
  patient, 
  initialFinding = null, 
  onClearFinding = null,
  insights = [], 
  forecast = null 
}) => {
  // Finding & Triage States
  const [selectedFinding, setSelectedFinding] = useState(initialFinding);
  const [findingType, setFindingType] = useState('insight'); // 'insight', 'forecast', 'custom'
  const [customConcern, setCustomConcern] = useState('');
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [triageError, setTriageError] = useState(null);

  // Search & Filter States
  const [locationQuery, setLocationQuery] = useState('Jaffna');
  const [searchRadius, setSearchRadius] = useState(25);
  const [availabilityPref, setAvailabilityPref] = useState('this_week');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [displayCount, setDisplayCount] = useState(10); // Display Top 10 by default

  // Modal & History States
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pre-configured Sri Lankan regional quick-select location chips
  const QUICK_LOCATIONS = ['Jaffna', 'Colombo', 'Kandy', 'Galle', 'Negombo', 'Batticaloa'];

  // Initialize from initialFinding if passed, or restore previous search from session cache strictly for this patient
  useEffect(() => {
    if (initialFinding) {
      setSelectedFinding(initialFinding);
      handleFetchTriageContext(initialFinding);
    } else if (patientId) {
      // Restore previously generated providers and triage for THIS specific patient
      try {
        const cached = sessionStorage.getItem(`medai_care_search_${patientId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSearchResult(parsed.searchResult || null);
          setTriageResult(parsed.triageResult || null);
          if (parsed.locationQuery) setLocationQuery(parsed.locationQuery);
          if (parsed.searchRadius) setSearchRadius(parsed.searchRadius);
          if (parsed.availabilityPref) setAvailabilityPref(parsed.availabilityPref);
          setSelectedFinding(parsed.selectedFinding || null);
          setCustomConcern(parsed.customConcern || '');
        } else {
          // If no search was run yet for this patient, keep results clean
          setSearchResult(null);
          setTriageResult(null);
          setSelectedFinding(null);
          setCustomConcern('');
          setSearchError(null);
          setTriageError(null);
        }
      } catch (e) {
        console.warn('[CareRecommendation] Failed to restore cached search:', e.message);
        setSearchResult(null);
        setTriageResult(null);
      }
    } else {
      setSearchResult(null);
      setTriageResult(null);
    }
  }, [initialFinding, patientId]);

  // Fetch AI Specialty Triage Context
  const handleFetchTriageContext = async (findingPayload = selectedFinding) => {
    if (!patientId) return;

    setLoadingTriage(true);
    setTriageError(null);
    setSearchResult(null);

    try {
      let body = { patientId };

      if (findingPayload) {
        if (findingPayload.id && findingPayload.insight_type) {
          body.insightId = findingPayload.id;
          body.findingContext = {
            issueType: findingPayload.insight_type,
            riskLevel: findingPayload.severity || 'moderate',
            clinicalSummary: findingPayload.description || '',
            evidence: findingPayload.evidence || '',
            patientAge: patient?.age,
            patientGender: patient?.gender
          };
        } else {
          body.findingContext = {
            issueType: findingPayload.issueType || 'clinical_concern',
            riskLevel: findingPayload.riskLevel || 'moderate',
            clinicalSummary: findingPayload.clinicalSummary || customConcern || 'Clinical consultation review.',
            patientAge: patient?.age,
            patientGender: patient?.gender
          };
        }
      } else if (customConcern) {
        body.findingContext = {
          issueType: 'custom_concern',
          riskLevel: 'moderate',
          clinicalSummary: customConcern,
          patientAge: patient?.age,
          patientGender: patient?.gender
        };
      }

      const res = await api.post('/recommendations/context', body);
      if (res.data && res.data.success) {
        setTriageResult(res.data.data.recommendation);
      } else {
        setTriageError(res.data?.message || 'Failed to determine care specialty.');
      }
    } catch (err) {
      console.error('[CareRecommendation] Triage fetch error:', err.message);
      setTriageError(err.response?.data?.message || 'Unable to connect to AI triage reasoning engine.');
    } finally {
      setLoadingTriage(false);
    }
  };

  // Search and Rank Real Healthcare Providers
  const handleSearchProviders = async (e) => {
    if (e) e.preventDefault();
    if (!locationQuery.trim() || !patientId) return;

    setLoadingSearch(true);
    setSearchError(null);
    setDisplayCount(10);

    try {
      const body = {
        patientId,
        location: locationQuery.trim(),
        radiusKm: searchRadius,
        availability: availabilityPref,
        insightId: selectedFinding?.id || null,
        findingContext: {
          issueType: selectedFinding?.insight_type || selectedFinding?.issueType || 'clinical_concern',
          riskLevel: selectedFinding?.severity || selectedFinding?.riskLevel || 'moderate',
          clinicalSummary: selectedFinding?.description || selectedFinding?.clinicalSummary || customConcern || 'Clinical assessment',
          patientAge: patient?.age,
          patientGender: patient?.gender
        }
      };

      const res = await api.post('/recommendations/search', body);
      if (res.data && res.data.success) {
        setSearchResult(res.data.data);
        const resolvedSpecialty = res.data.data.specialty || triageResult;
        if (res.data.data.specialty) {
          setTriageResult(res.data.data.specialty);
        }

        // Cache to sessionStorage so results persist across tab and page switches
        try {
          sessionStorage.setItem(`medai_care_search_${patientId}`, JSON.stringify({
            searchResult: res.data.data,
            triageResult: resolvedSpecialty,
            locationQuery,
            searchRadius,
            availabilityPref,
            selectedFinding,
            customConcern
          }));
        } catch (cacheErr) {
          console.warn('[CareRecommendation] Cache save warning:', cacheErr.message);
        }
      } else {
        setSearchError(res.data?.message || 'No healthcare providers found in this area.');
      }
    } catch (err) {
      console.error('[CareRecommendation] Search error:', err.message);
      setSearchError(err.response?.data?.message || 'Failed to search for healthcare providers in this location.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Fetch Recommendation History for Patient
  const handleFetchHistory = async () => {
    if (!patientId) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/recommendations/history/${patientId}`);
      if (res.data && res.data.success) {
        setHistorySessions(res.data.data);
      }
    } catch (err) {
      console.error('[CareRecommendation] History fetch error:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getCareTypeBadgeColor = (type) => {
    switch (type) {
      case 'specialist': return { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe', label: 'Specialist Care' };
      case 'urgent_care': return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'Urgent Care / Emergency' };
      case 'pharmacist': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Clinical Pharmacist' };
      default: return { bg: '#f0fdfa', text: '#0f766e', border: '#ccfbf1', label: 'Primary Care' };
    }
  };

  const getFacilityIcon = (facilityType) => {
    switch (facilityType) {
      case 'hospital': return <Building2 size={16} className="text-teal-600" />;
      case 'pharmacy': return <Shield size={16} className="text-sky-600" />;
      default: return <Stethoscope size={16} className="text-purple-600" />;
    }
  };

  return (
    <div className="care-recommendation-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Card */}
      <div className="dashboard-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Compass size={24} style={{ color: '#5eead4' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)', color: 'white' }}>
                Local Doctor & Care Navigation Engine
              </h2>
            </div>
            <p style={{ fontSize: '13px', margin: 0, opacity: 0.9, maxWidth: '650px', color: '#f0fdfa' }}>
              Connect detected medical alerts, medication conflicts, and health forecasts with real-world local physicians, specialized clinics, and verified hospitals.
            </p>
          </div>

          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) handleFetchHistory();
            }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            <History size={15} />
            <span>{showHistory ? 'Back to Navigation' : 'Past Searches'}</span>
          </button>
        </div>
      </div>

      {/* History View Modal / Section */}
      {showHistory ? (
        <div className="dashboard-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Recommendation Audit History for {patient?.patient_name}</span>
            </h3>
            <button 
              onClick={() => setShowHistory(false)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner-primary"></div>
            </div>
          ) : historySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
              <Info size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p>No past recommendation searches found for this patient.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historySessions.map(session => (
                <div 
                  key={session.id} 
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-main)', fontSize: '14px' }}>
                        {session.recommended_specialty || 'General Practice'}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                        {session.recommended_care_type}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📍 {session.normalized_location || session.location_query}</span>
                      <span>•</span>
                      <span>🎯 {session.total_providers_found} real providers found</span>
                      <span>•</span>
                      <span>📅 {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Main 2-Column Grid: Left Controls & AI Triage / Right Provider Results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 1.8fr', gap: '24px' }} className="care-navigation-grid">
            
            {/* LEFT COLUMN: Finding Selector & AI Specialty Reasoning Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Step 1: Health Concern Selector */}
              <div className="dashboard-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={17} style={{ color: 'var(--color-primary)' }} />
                    <span>Choose a Health Concern</span>
                  </h3>
                  {(selectedFinding || customConcern) && (
                    <button 
                      onClick={() => {
                        setSelectedFinding(null);
                        setCustomConcern('');
                        if (onClearFinding) onClearFinding();
                        setTriageResult(null);
                        setSearchResult(null);
                      }}
                      style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Path 1: Detected Patient Risk Alerts (Only if detected alerts exist) */}
                {insights && insights.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={13} style={{ color: 'var(--color-primary)' }} />
                      <span>Detected Patient Risk Alerts</span>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {insights.map(ins => {
                        const isSelected = selectedFinding?.id === ins.id;
                        const formattedType = (ins.insight_type || 'Clinical Alert')
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, c => c.toUpperCase());

                        return (
                          <div
                            key={ins.id}
                            onClick={() => {
                              setSelectedFinding(ins);
                              setCustomConcern('');
                              handleFetchTriageContext(ins);
                            }}
                            style={{
                              padding: '11px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                              backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                              boxShadow: isSelected ? '0 0 0 1px var(--color-primary)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                                {formattedType}
                              </span>
                              <span style={{ 
                                fontSize: '10.5px', 
                                padding: '2px 7px', 
                                borderRadius: '10px', 
                                backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'rgba(0,0,0,0.06)',
                                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: 600
                              }}>
                                Conf {Math.round(ins.confidence_score || 80)}%
                              </span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.35 }}>
                              {ins.description ? (ins.description.length > 95 ? ins.description.substring(0, 95) + '...' : ins.description) : 'Clinical finding.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Clear Separator: OR */}
                    <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 6px 0', gap: '10px' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        OR
                      </span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                    </div>
                  </div>
                )}

                {/* Path 2: Enter a Health Concern */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>
                    Enter a Health Concern
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="e.g. High blood pressure, Diabetes review, Chest pain"
                      value={customConcern}
                      onChange={(e) => {
                        setCustomConcern(e.target.value);
                        if (selectedFinding) setSelectedFinding(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customConcern.trim()) {
                          setSelectedFinding(null);
                          handleFetchTriageContext(null);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-main)'
                      }}
                    />
                    <button
                      onClick={() => {
                        setSelectedFinding(null);
                        handleFetchTriageContext(null);
                      }}
                      disabled={loadingTriage || (!customConcern.trim() && !selectedFinding)}
                      style={{
                        width: '100%',
                        padding: '9px 16px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: (!customConcern.trim() && !selectedFinding) ? 'not-allowed' : 'pointer',
                        opacity: (!customConcern.trim() && !selectedFinding) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {loadingTriage ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Triaging...</span>
                        </>
                      ) : (
                        <span>Triage</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: AI Care & Specialty Triage Result */}
              {loadingTriage ? (
                <div className="dashboard-card" style={{ padding: '30px', textAlign: 'center' }}>
                  <div className="spinner-primary" style={{ margin: '0 auto 12px auto' }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>AI analyzing clinical context & specialty routing...</span>
                </div>
              ) : triageResult ? (
                <div className="dashboard-card" style={{ padding: '20px', borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)' }}>
                        AI Recommended Care
                      </span>
                      <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                        {triageResult.recommendedSpecialty}
                      </h4>
                    </div>
                    {(() => {
                      const badge = getCareTypeBadgeColor(triageResult.careType);
                      return (
                        <span style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '16px'
                        }}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Confidence Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Triage Confidence</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                        {Math.round((triageResult.confidence || 0.85) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.round((triageResult.confidence || 0.85) * 100)}%`,
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '3px'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Clinical Reason */}
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                    {triageResult.reason}
                  </p>

                  {/* Alternative Specialties */}
                  {triageResult.alternativeSpecialties && triageResult.alternativeSpecialties.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--color-border)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
                        Alternative Care Pathways:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {triageResult.alternativeSpecialties.map((alt, idx) => (
                          <span 
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              backgroundColor: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '12px',
                              color: 'var(--color-text-muted)'
                            }}
                          >
                            {alt.specialty} ({Math.round((alt.confidence || 0.7) * 100)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer banner */}
                  <div style={{ marginTop: '12px', padding: '8px 10px', backgroundColor: '#fffbe6', border: '1px solid #fef3c7', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#92400e', display: 'flex', gap: '6px' }}>
                    <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Care triage suggests physician specialties for provider discovery and does not substitute a clinical diagnosis.</span>
                  </div>
                </div>
              ) : null}

              {/* Step 3: Location Search & Filter Controls */}
              <div className="dashboard-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Search Location & Filters</span>
                </h3>

                <form onSubmit={handleSearchProviders} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* City/Town Input */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      City, Town, or District:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-light)' }} />
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="e.g. Jaffna, Colombo, Kandy"
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 34px',
                          fontSize: '13px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)'
                        }}
                      />
                    </div>

                    {/* Quick location chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {QUICK_LOCATIONS.map(loc => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocationQuery(loc)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: locationQuery === loc ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                            backgroundColor: locationQuery === loc ? 'var(--color-primary-light)' : 'var(--color-surface)',
                            color: locationQuery === loc ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Radius Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Search Radius:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{searchRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Availability Preference */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      Availability Preference:
                    </label>
                    <select
                      value={availabilityPref}
                      onChange={(e) => setAvailabilityPref(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12.5px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)'
                      }}
                    >
                      <option value="this_week">This Week (Standard Outpatient)</option>
                      <option value="today">Today / Urgent Consultation</option>
                      <option value="evenings">Evenings / Extended Hours</option>
                      <option value="weekends">Weekends</option>
                      <option value="flexible">Flexible / Any Available</option>
                    </select>
                  </div>

                  {/* Search Button */}
                  <button
                    type="submit"
                    disabled={loadingSearch || !locationQuery.trim()}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {loadingSearch ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Searching Real Providers...</span>
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        <span>Find Matching Providers</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: Ranked Providers List */}
            <div>
              {loadingSearch ? (
                <div className="dashboard-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div className="spinner-primary" style={{ margin: '0 auto 16px auto' }}></div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    Discovering Real Public Healthcare Providers
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '6px auto 0 auto' }}>
                    Querying OpenStreetMap verified healthcare directories and scoring clinical relevance...
                  </p>
                </div>
              ) : searchError ? (
                <div className="dashboard-card" style={{ padding: '30px', textAlign: 'center', borderTop: '4px solid var(--color-danger)' }}>
                  <AlertCircle size={36} style={{ color: 'var(--color-danger)', margin: '0 auto 12px auto' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    Provider Retrieval Notice
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 16px 0' }}>
                    {searchError}
                  </p>
                  <button
                    onClick={() => handleSearchProviders()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              ) : searchResult && searchResult.providers ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Results Header Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
                        Ranked Healthcare Providers ({searchResult.totalCount})
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Near <strong>{searchResult.location?.displayName || locationQuery}</strong> (Radius: {searchResult.searchRadiusKm} km)
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={12} />
                      <span>{searchResult.sourceAttribution || 'Public Directory'}</span>
                    </span>
                  </div>

                  {/* Empty Results Case */}
                  {searchResult.providers.length === 0 ? (
                    <div className="dashboard-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <Building2 size={36} style={{ color: 'var(--color-text-light)', margin: '0 auto 12px auto' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        No Healthcare Providers Found
                      </h4>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>
                        No clinics or hospitals matched this specialty within {searchResult.searchRadiusKm} km. Try expanding the search radius or selecting an adjacent city.
                      </p>
                    </div>
                  ) : (
                    /* Provider Cards List (Top 10 initially, expandable via Show More) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {searchResult.providers.slice(0, displayCount).map((prov) => {
                        const rankScore = prov.ranking?.totalScore || 75;
                        const matchPct = prov.ranking?.matchScorePercent || Math.round(rankScore);
                        const isTop = prov.rank === 1;

                        return (
                          <div
                            key={prov.id}
                            className="dashboard-card"
                            style={{
                              padding: '18px',
                              borderLeft: isTop ? '4px solid #10b981' : '1px solid var(--color-border)',
                              position: 'relative',
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: isTop ? '#f0fdf4' : 'var(--color-bg)',
                                    color: isTop ? '#15803d' : 'var(--color-text-muted)',
                                    border: isTop ? '1px solid #bbf7d0' : '1px solid var(--color-border)'
                                  }}>
                                    Rank #{prov.rank}
                                  </span>

                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--color-text-muted)',
                                    backgroundColor: 'var(--color-bg)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    {getFacilityIcon(prov.facilityType)}
                                    <span style={{ textTransform: 'capitalize' }}>{prov.facilityType || 'Healthcare Facility'}</span>
                                  </span>

                                  {prov.governmentVerification?.isVerified && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#047857',
                                      backgroundColor: '#ecfdf5',
                                      border: '1px solid #a7f3d0',
                                      padding: '2px 8px',
                                      borderRadius: '12px'
                                    }}>
                                      <CheckCircle size={11} />
                                      <span>Government Verified · {prov.governmentVerification.facilityCategory || 'MOH Sri Lanka'}</span>
                                    </span>
                                  )}

                                  {prov.distanceKm != null && (
                                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                      • {prov.distanceKm} km away
                                    </span>
                                  )}
                                </div>

                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-text-main)' }}>
                                  {prov.name}
                                </h4>
                              </div>

                              {/* Match Score Badge */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '60px',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isTop ? '#f0fdf4' : 'var(--color-primary-light)',
                                border: isTop ? '1px solid #bbf7d0' : '1px solid rgba(20,184,166,0.3)'
                              }}>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: isTop ? '#15803d' : 'var(--color-primary)', lineHeight: 1 }}>
                                  {matchPct}%
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                                  Match
                                </span>
                              </div>
                            </div>

                            {/* Address & Contact Row */}
                            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '5px', margin: '8px 0 10px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={14} style={{ flexShrink: 0, color: 'var(--color-text-light)' }} />
                                <span>{prov.address || 'Address not listed in directory'}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {prov.phone ? (
                                  <a 
                                    href={`tel:${prov.phone}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                                  >
                                    <Phone size={13} />
                                    <span>{prov.phone}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-light)' }}>
                                    Phone: Not listed
                                  </span>
                                )}

                                {prov.rating != null ? (
                                  <span style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '1px 7px', borderRadius: '4px' }}>
                                    <span>★ {Number(prov.rating).toFixed(1)}</span>
                                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>({prov.reviewCount || 0} Google ratings)</span>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-light)' }}>
                                    Rating: Not listed in public directory
                                  </span>
                                )}

                                {prov.openingHours != null && (
                                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} style={{ color: 'var(--color-primary)' }} />
                                    <span>{typeof prov.openingHours === 'boolean' ? (prov.openingHours ? 'Open Now' : 'Closed') : prov.openingHours}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Match Reasons & Primary Rationale */}
                            {prov.ranking?.primaryExplanation && (
                              <div style={{ backgroundColor: 'var(--color-bg)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-main)', marginBottom: '10px' }}>
                                <strong>Match Reason:</strong> {prov.ranking.primaryExplanation}
                              </div>
                            )}

                            {/* Card Footer: Action Buttons & Breakdown trigger */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                              <button
                                onClick={() => setSelectedScoreBreakdown(prov)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-primary)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Sliders size={13} />
                                <span>Score Breakdown</span>
                              </button>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {prov.phone && (
                                  <a
                                    href={`tel:${prov.phone}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      backgroundColor: 'var(--color-bg)',
                                      color: 'var(--color-primary)',
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <Phone size={12} />
                                    <span>Call</span>
                                  </a>
                                )}

                                {prov.mapUrl && (
                                  <a
                                    href={prov.mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      backgroundColor: 'var(--color-primary)',
                                      color: 'white',
                                      borderRadius: 'var(--radius-sm)',
                                      textDecoration: 'none',
                                      boxShadow: 'var(--shadow-sm)'
                                    }}
                                    className="btn-primary"
                                  >
                                    <Navigation size={12} />
                                    <span>Directions</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Show More Providers Pagination Action */}
                      {searchResult.providers.length > displayCount && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '16px 0 8px 0' }}>
                          <button
                            type="button"
                            onClick={() => setDisplayCount(prev => prev + 10)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '10px 24px',
                              backgroundColor: 'var(--color-surface)',
                              border: '1.5px solid var(--color-primary)',
                              color: 'var(--color-primary)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                              transition: 'all 0.2s ease',
                              fontFamily: 'var(--font-display)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                              e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                          >
                            <span>Show 10 More Providers</span>
                            <ChevronRight size={15} />
                          </button>
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                            Showing {Math.min(displayCount, searchResult.providers.length)} of {searchResult.providers.length} discovered healthcare facilities
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                /* Initial Welcome / Instructions Card */
                <div className="dashboard-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Compass size={44} style={{ color: 'var(--color-primary)', margin: '0 auto 16px auto', opacity: 0.8 }} />
                  <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'var(--font-display)' }}>
                    Find Verified Healthcare Providers for {patient?.patient_name}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '460px', margin: '8px auto 0 auto' }}>
                    Select an active medical alert on the left, verify the AI-recommended medical specialty, choose your preferred locality, and click <strong>Find Matching Providers</strong>.
                  </p>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Score Breakdown Modal */}
      {selectedScoreBreakdown && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="dashboard-card" style={{ maxWidth: '520px', width: '100%', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                  Transparent Scoring Formula
                </span>
                <h4 style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-text-main)' }}>
                  {selectedScoreBreakdown.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedScoreBreakdown(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Overall Recommendation Match:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {selectedScoreBreakdown.ranking?.totalScore || 80}/100 pts
              </span>
            </div>

            {/* 5-Dimension Score Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              {/* 1. Specialty Relevance (40 max) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>1. Clinical Specialty Relevance (Max 40 pts)</span>
                  <strong>{selectedScoreBreakdown.ranking?.scoreBreakdown?.specialtyScore || 30} pts</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((selectedScoreBreakdown.ranking?.scoreBreakdown?.specialtyScore || 30) / 40) * 100}%`, backgroundColor: '#8b5cf6' }} />
                </div>
              </div>

              {/* 2. Proximity / Distance (30 max) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>2. Proximity / Distance Decay (Max 30 pts)</span>
                  <strong>{selectedScoreBreakdown.ranking?.scoreBreakdown?.distanceScore || 20} pts</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((selectedScoreBreakdown.ranking?.scoreBreakdown?.distanceScore || 20) / 30) * 100}%`, backgroundColor: 'var(--color-primary)' }} />
                </div>
              </div>

              {/* 3. Reputation / Neutral Baseline (15 max) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>3. Directory Reputation Signal (Max 15 pts)</span>
                  <strong>{selectedScoreBreakdown.ranking?.scoreBreakdown?.reputationScore || 8} pts</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((selectedScoreBreakdown.ranking?.scoreBreakdown?.reputationScore || 8) / 15) * 100}%`, backgroundColor: '#f59e0b' }} />
                </div>
              </div>

              {/* 4. Data Completeness (10 max) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>4. Verified Metadata & Contact (Max 10 pts)</span>
                  <strong>{selectedScoreBreakdown.ranking?.scoreBreakdown?.completenessScore || 7.5} pts</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((selectedScoreBreakdown.ranking?.scoreBreakdown?.completenessScore || 7.5) / 10) * 100}%`, backgroundColor: '#0ea5e9' }} />
                </div>
              </div>

              {/* 5. Availability Alignment (5 max) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>5. Facility Capability Alignment (Max 5 pts)</span>
                  <strong>{selectedScoreBreakdown.ranking?.scoreBreakdown?.availabilityScore || 4.5} pts</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((selectedScoreBreakdown.ranking?.scoreBreakdown?.availabilityScore || 4.5) / 5) * 100}%`, backgroundColor: '#10b981' }} />
                </div>
              </div>
            </div>

            {/* Explainable match bullets */}
            {selectedScoreBreakdown.ranking?.matchReasons && selectedScoreBreakdown.ranking.matchReasons.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
                  Audit Details & Match Reasons:
                </span>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                  {selectedScoreBreakdown.ranking.matchReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setSelectedScoreBreakdown(null)}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CareRecommendation;
