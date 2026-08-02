import React, { useState, useEffect, useRef } from 'react';
import { api } from '../context/AuthContext.jsx';
import { Send, FileText, Check, ShieldAlert } from 'lucide-react';

const QaChat = ({ patientId, documents = [], onViewDocument }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});
  
  const chatHistoryRef = useRef(null);

  // Initialize/Reset conversation and load chat logs from database when patient selection shifts
  useEffect(() => {
    const fetchChatLogs = async () => {
      setSending(true);
      try {
        const res = await api.get(`/ask/history/${patientId}`);
        const savedMessages = res.data.data;
        
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          // Fallback greeting if no messages exist in the database
          setMessages([
            {
              sender: 'ai',
              text: 'Hello! I am your evidence-based medical record assistant. You can ask me questions about this patient\'s treatment history, medications, diagnostics, or trends, and I will search their files for direct evidence.',
              isSystem: true
            }
          ]);
        }
      } catch (err) {
        console.error('[QA History Load Failed]', err.message);
        // Fallback greeting on error
        setMessages([
          {
            sender: 'ai',
            text: 'Hello! I am your evidence-based medical record assistant. You can ask me questions about this patient\'s treatment history, medications, diagnostics, or trends, and I will search their files for direct evidence.',
            isSystem: true
          }
        ]);
      } finally {
        setSending(false);
        setInputValue('');
        setExpandedDetails({});
      }
    };

    if (patientId) {
      fetchChatLogs();
    }
  }, [patientId]);

  // Autoscroll chat history to focus on fresh replies
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleDetails = (idx) => {
    setExpandedDetails(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const userQuestion = inputValue.trim();
    setInputValue('');
    setSending(true);

    // 1. Render User message bubble
    setMessages(prev => [...prev, { sender: 'user', text: userQuestion }]);

    // 2. Render AI thinking state bubble
    setMessages(prev => [...prev, { sender: 'ai', loading: true }]);

    try {
      // 3. Request answer from RAG pipeline
      const res = await api.post('/ask', {
        patientId,
        question: userQuestion
      });

      const responseData = res.data.data;

      // 4. Overwrite thinking state bubble with structured AI details
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          sender: 'ai',
          text: responseData.answer,
          evidence: responseData.evidence,
          confidence: responseData.confidence,
          riskLevel: responseData.risk_level,
          recommendation: responseData.recommendation
        };
        return updated;
      });

    } catch (err) {
      console.error('[QA Request Failed]', err.message);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          sender: 'ai',
          text: 'Sorry, I encountered an error while retrieving the patient context. Please verify the backend connection and try again.'
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages Feed */}
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'ai'}`}
          >
            {msg.loading ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px' }}>
                <div className="spinner-primary" style={{ width: '16px', height: '16px', borderTopColor: 'var(--color-primary-hover)' }}></div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Consulting medical record index...</span>
              </div>
            ) : (
              <div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                
                {/* AI Detail Panels for Evidential Citation & Safety */}
                {msg.sender === 'ai' && !msg.isSystem && msg.evidence && (
                  <div className="ai-details-wrapper" style={{ 
                    marginTop: '16px', 
                    padding: '16px', 
                    backgroundColor: 'rgba(248, 250, 252, 0.95)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    animation: 'fadeIn 0.25s ease-out'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
                      <FileText size={14} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grounded Source Evidence</span>
                    </div>

                    {/* Evidence Quote Block */}
                    <div style={{ 
                      padding: '10px 14px', 
                      backgroundColor: 'white', 
                      borderLeft: '3px solid var(--color-primary)', 
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', 
                      fontSize: '12.5px', 
                      color: 'var(--color-text-main)', 
                      lineHeight: '1.6',
                      marginBottom: '12px',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      {msg.evidence}
                    </div>

                    {/* Clickable matching document badges */}
                    {documents && documents.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {documents.filter(doc => {
                          const cleanEvidence = msg.evidence.toLowerCase();
                          const cleanName = doc.file_name.toLowerCase();
                          const baseName = doc.file_name.split('.').slice(0, -1).join('.').toLowerCase();
                          return cleanEvidence.includes(cleanName) || 
                                 (baseName.length > 0 && cleanEvidence.includes(`document: ${baseName}`)) ||
                                 (baseName.length > 0 && cleanEvidence.includes(`(document: ${baseName}.`)) ||
                                 cleanEvidence.includes(baseName);
                        }).map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => onViewDocument && onViewDocument(doc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: 'rgba(13, 148, 136, 0.05)',
                              border: '1px solid rgba(13, 148, 136, 0.15)',
                              borderRadius: 'var(--radius-md)',
                              padding: '5px 12px',
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease'
                            }}
                            className="btn-glass-hover"
                          >
                            <FileText size={12} style={{ flexShrink: 0 }} />
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.file_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Stats and Risk Grid */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginBottom: '12px', 
                      borderTop: '1px solid var(--color-border)', 
                      paddingTop: '12px',
                      flexWrap: 'wrap'
                    }}>
                      {msg.confidence !== undefined && (
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          backgroundColor: 'rgba(13, 148, 136, 0.05)', 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(13, 148, 136, 0.1)' 
                        }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Confidence:</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700 }}>
                            <Check size={11} />
                            {msg.confidence}%
                          </span>
                        </div>
                      )}

                      {msg.riskLevel && (
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          backgroundColor: msg.riskLevel.toLowerCase() === 'low' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          border: msg.riskLevel.toLowerCase() === 'low' ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                        }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Risk Rating:</span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            color: msg.riskLevel.toLowerCase() === 'low' ? 'var(--color-success)' : '#ef4444' 
                          }}>
                            {msg.riskLevel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recommendation note */}
                    {msg.recommendation && (
                      <div 
                        className="alert-box alert-warning"
                        style={{ 
                          margin: '8px 0 0 0', 
                          padding: '10px 12px',
                          boxShadow: 'none',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '11.5px', lineHeight: '1.5' }}>
                          <strong>Safety Advice:</strong> {msg.recommendation}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Permanent Medical Safety Disclaimer Banner */}
      <div 
        className="alert-box alert-warning"
        style={{ 
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderBottom: 0,
          padding: '10px 16px',
          fontSize: '11.5px',
          boxShadow: 'none'
        }}
      >
        <ShieldAlert size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>Clinical Notice:</strong> AI Clinical Assistant can make mistakes. Always refer to a doctor or pharmacist for clinical advice.
        </span>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask e.g. Has this patient taken Paracetamol?"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={sending}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          style={{ width: '45px', height: '45px', padding: 0 }}
          disabled={sending || !inputValue.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default QaChat;
