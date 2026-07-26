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
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: 'var(--color-bg)', 
                    border: '1px dashed var(--color-border)', 
                    borderRadius: 'var(--radius-sm)',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <div className="ai-meta-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                      <span className="ai-meta-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Evidence:</span>
                      <span className="ai-meta-val" style={{ fontSize: '12px', fontStyle: 'italic', fontWeight: 400, color: 'var(--color-text-main)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <FileText size={13} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--color-primary)' }} />
                        {msg.evidence}
                      </span>

                      {/* Clickable matching document badges */}
                      {documents && documents.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
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
                                backgroundColor: 'rgba(13, 148, 136, 0.06)',
                                border: '1px solid var(--color-primary-light)',
                                borderRadius: '20px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                                outline: 'none'
                              }}
                              className="btn-glass-hover"
                              title={`Click to preview ${doc.file_name} in dialog`}
                            >
                              <FileText size={11} style={{ flexShrink: 0 }} />
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                View {doc.file_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                      {msg.confidence !== undefined && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="ai-meta-label" style={{ fontSize: '11px' }}>Confidence:</span>
                          <span className="ai-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '12px' }}>
                            <Check size={12} />
                            {msg.confidence}%
                          </span>
                        </div>
                      )}

                      {msg.riskLevel && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="ai-meta-label" style={{ fontSize: '11px' }}>Risk Level:</span>
                          <span className={`ai-meta-val ${msg.riskLevel.toLowerCase()}`} style={{ fontSize: '12px' }}>
                            {msg.riskLevel}
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.recommendation && (
                      <div 
                        className="disclaimer-banner"
                        style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '8px 0 0 0', padding: '10px' }}
                      >
                        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#92400e' }} />
                        <span><strong>Clinical Note:</strong> {msg.recommendation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
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
