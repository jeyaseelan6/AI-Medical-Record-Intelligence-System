import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Activity, ArrowRight, Shield, CheckCircle, Compass, 
  FileText, Sparkles, MapPin, Building2, Stethoscope, ChevronRight 
} from 'lucide-react';

/**
 * LandingPage Component
 * 
 * Premium, minimal, and elegant entry point for MedAI.
 * Demonstrates health intelligence and care navigation with restrained, trustworthy healthcare aesthetic.
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleStart = () => {
    if (token) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      
      {/* Top Minimal Navigation Bar */}
      <header style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Brand */}
          <div 
            onClick={() => navigate('/')} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#14b8a6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(20, 184, 166, 0.25)'
            }}>
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px', color: '#0f172a', fontFamily: 'var(--font-display)' }}>
              MedAI
            </span>
          </div>

          {/* Nav Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!token ? (
              <>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#334155',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px 12px',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#334155'}
                >
                  Log In
                </button>

                <button
                  onClick={() => navigate('/signup')}
                  style={{
                    backgroundColor: '#14b8a6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(20, 184, 166, 0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d9488';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#14b8a6';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(20, 184, 166, 0.2)';
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/app')}
                style={{
                  backgroundColor: '#14b8a6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(20, 184, 166, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '72px 24px 60px 24px',
        textAlign: 'center',
        width: '100%'
      }}>
        {/* Small Brand Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          backgroundColor: '#f0fdfa',
          border: '1px solid #ccfbf1',
          color: '#0d9488',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          marginBottom: '24px'
        }}>
          <Sparkles size={13} />
          <span>MedAI Health Intelligence</span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 54px)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-1.2px',
          color: '#0f172a',
          margin: '0 auto 20px auto',
          maxWidth: '780px',
          fontFamily: 'var(--font-display)'
        }}>
          Understand Your Health.<br />
          <span style={{ color: '#0d9488' }}>Take the Next Step.</span>
        </h1>

        {/* Supporting Text */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: '#475569',
          lineHeight: 1.6,
          maxWidth: '620px',
          margin: '0 auto 32px auto',
          fontWeight: 400
        }}>
          AI-powered health intelligence that connects your medical information with the care you may need.
        </p>

        {/* Primary CTA and Log In Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(token ? '/app' : '/signup')}
              style={{
                backgroundColor: '#14b8a6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 32px',
                fontSize: '15.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0d9488';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(20, 184, 166, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#14b8a6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(20, 184, 166, 0.28)';
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>

            {!token && (
              <button
                onClick={() => navigate('/login')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontSize: '15.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                Log In
              </button>
            )}
          </div>

          {/* Small Trust Line */}
          <div style={{
            fontSize: '12.5px',
            color: '#64748b',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px'
          }}>
            <Shield size={13} style={{ color: '#14b8a6' }} />
            <span>Secure • Evidence-grounded • Care-focused</span>
          </div>
        </div>

        {/* Product Preview / Realistic UI Mockup */}
        <div style={{
          maxWidth: '920px',
          margin: '0 auto',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          textAlign: 'left'
        }}>
          {/* Mockup Window Header */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', marginLeft: '8px' }}>
                MedAI Platform — Care Intelligence Preview
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
              Sample Workflow
            </span>
          </div>

          {/* Mockup Body Content */}
          <div style={{ padding: '24px', backgroundColor: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Panel 1: Health Insight & Concern */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 8px', borderRadius: '10px', border: '1px solid #ccfbf1' }}>
                  AI Health Intelligence
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Clinical Finding</span>
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                Medication Conflict Analysis
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.45 }}>
                Identifies potential dosage conflicts, duplicate therapies, or clinical follow-up needs across records.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#0d9488' }}>
                <span>Action: Care Navigation Review</span>
                <ArrowRight size={12} />
              </div>
            </div>

            {/* Panel 2: Real Healthcare Provider Discovery */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '18px',
              borderLeft: '4px solid #10b981',
              borderTop: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d', backgroundColor: '#f0fdf4', padding: '1px 6px', borderRadius: '10px' }}>
                      Rank #1
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '10px' }}>
                      ✓ Verified Facility
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Regional Healthcare Center
                  </h4>
                </div>
                <div style={{ textAlign: 'center', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#15803d', display: 'block', lineHeight: 1 }}>Top</span>
                  <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Match</span>
                </div>
              </div>

              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 10px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} style={{ color: '#94a3b8' }} />
                <span>Nearby Healthcare Directory Listing</span>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Public Directory & Contact</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#14b8a6' }}>View Directions →</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. THREE CORE BENEFITS */}
      <section style={{
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        padding: '72px 24px'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {/* Card 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px 28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <FileText size={20} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                Understand
              </h3>
              <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Your medical information, clearly.
              </p>
            </div>

            {/* Card 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px 28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Sparkles size={20} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                Discover
              </h3>
              <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Important health concerns and care needs.
              </p>
            </div>

            {/* Card 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px 28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Compass size={20} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                Navigate
              </h3>
              <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Find relevant real-world healthcare providers.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. PRODUCT STORY / PROGRESSION */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '80px 24px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#0d9488',
          marginBottom: '40px'
        }}>
          How MedAI Works
        </h2>

        {/* Visual Progression Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center',
          maxWidth: '960px',
          margin: '0 auto'
        }}>
          
          {/* Step 1 */}
          <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>STEP 01</span>
            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>Your Health Information</strong>
          </div>

          {/* Step 2 */}
          <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', display: 'block', marginBottom: '6px' }}>STEP 02</span>
            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>AI Understanding</strong>
          </div>

          {/* Step 3 */}
          <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', display: 'block', marginBottom: '6px' }}>STEP 03</span>
            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>Care Guidance</strong>
          </div>

          {/* Step 4 */}
          <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', display: 'block', marginBottom: '6px' }}>STEP 04</span>
            <strong style={{ fontSize: '15px', color: '#0d9488', display: 'block' }}>Real-World Care</strong>
          </div>

        </div>
      </section>

      {/* 4. FINAL CTA */}
      <section style={{
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        padding: '72px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.25,
            letterSpacing: '-0.8px',
            marginBottom: '24px',
            fontFamily: 'var(--font-display)'
          }}>
            From health information<br />
            to meaningful action.
          </h2>

          <button
            onClick={handleStart}
            style={{
              backgroundColor: '#14b8a6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '13px 32px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0d9488';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(20, 184, 166, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#14b8a6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.25)';
            }}
          >
            <span>Explore MedAI</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer style={{
        marginTop: 'auto',
        padding: '40px 24px',
        maxWidth: '1120px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '5px',
              backgroundColor: '#14b8a6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Activity size={12} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
              MedAI
            </span>
          </div>

          {/* Disclaimer */}
          <p style={{
            fontSize: '12px',
            color: '#94a3b8',
            maxWidth: '680px',
            lineHeight: 1.5,
            margin: 0
          }}>
            MedAI provides informational and care-navigation support and does not replace professional medical diagnosis or emergency medical care.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
